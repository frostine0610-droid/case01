import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import gameData from '../../gameData.json';
import {
  calculateCompletionReward,
  canSubmitReport,
  gradeReport,
  redeemClueHint,
} from './engine.js';
import { loadSavedSession } from './saveState.js';

const GameContext = createContext(null);
const STORAGE_KEY = gameData.game.saveKey;
const SAVE_VERSION = 11;

const SAVED_SESSION = loadSavedSession(
  typeof localStorage === 'undefined' ? null : localStorage,
  STORAGE_KEY,
  SAVE_VERSION,
  gameData
);

export function GameProvider({ children }) {
  const [gameState, setGameState] = useState(() => ({
    ...gameData.initialState,
    ...(SAVED_SESSION?.gameState || {}),
  }));
  const stateRef = useRef(gameState);

  const applyState = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(stateRef.current) : updater;
    stateRef.current = next;
    setGameState(next);
    return next;
  }, []);

  const [screen, setScreen] = useState(
    SAVED_SESSION?.screen || gameData.game.startScreenId || 'briefing'
  );
  const [openAppId, setOpenAppId] = useState(null);
  const [toast, setToast] = useState(null);
  const [materialDetailId, setMaterialDetailId] = useState(null);
  const toastQueue = useRef([]);
  const toastTimer = useRef(null);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastQueue.current = [];
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: SAVE_VERSION, gameState, screen }));
    } catch {
      // 存储不可用时不影响本次游玩。
    }
  }, [gameState, screen]);

  const showToast = useCallback((text) => {
    toastQueue.current.push(text);
    if (toastTimer.current) return;
    const step = () => {
      const item = toastQueue.current.shift();
      if (item == null) {
        setToast(null);
        toastTimer.current = null;
        return;
      }
      setToast(item);
      toastTimer.current = setTimeout(step, 1900);
    };
    step();
  }, []);

  const startInvestigation = useCallback(() => {
    applyState((prev) => ({
      ...prev,
      investigationStartedAt: prev.investigationStartedAt || Date.now(),
    }));
    setScreen('phone');
  }, [applyState]);
  // 登录系统：登录页 → 案件简报（开场视频）
  const loginToSystem = useCallback(() => setScreen('briefing'), []);
  // 结算页返回案件：回手机继续查看
  const backToCase = useCallback(() => setScreen('phone'), []);
  // 从报告结案卡再入结算页
  const viewSettlement = useCallback(() => setScreen('settlement'), []);

  // 有意义的查看行为会自动记录为线索；重复查看不会重复提示。
  const recordObservation = useCallback(
    (materialId) => {
      const material = gameData.evidence.find((item) => item.id === materialId);
      if (!material || stateRef.current.observedMaterialIds.includes(materialId)) return false;
      applyState((prev) => ({
        ...prev,
        observedMaterialIds: [...prev.observedMaterialIds, materialId],
      }));
      showToast(`已记录线索：${material.title}`);
      return true;
    },
    [applyState, showToast]
  );

  const viewMaterial = useCallback((id) => setMaterialDetailId(id), []);
  const dismissMaterialDetail = useCallback(() => setMaterialDetailId(null), []);

  const markSeen = useCallback(
    (contentId) => {
      if (stateRef.current.seenContentIds.includes(contentId)) return;
      applyState((prev) => ({ ...prev, seenContentIds: [...prev.seenContentIds, contentId] }));
    },
    [applyState]
  );

  const purchaseHint = useCallback(() => {
    const result = redeemClueHint(stateRef.current, gameData, 100);
    if (!result.ok) {
      showToast(result.reason === 'points' ? '积分不足，无法兑换提示' : '没有可兑换的未发现线索');
      return result;
    }
    applyState(result.state);
    showToast(`已花费 100 积分：${result.clue.hint}`);
    return result;
  }, [applyState, showToast]);

  // 跨应用核对：二手卖家联系尾号（商品页点击）与通讯录同尾号联系人详情
  // 两侧都查看后，自动记录为线索（E08）。
  useEffect(() => {
    const target = gameData.content.marketplace.inspectTargets.find(
      (t) => Array.isArray(t.requiresSeenIds) && t.requiresSeenIds.length > 0
    );
    if (!target) return;
    const seen = new Set(gameState.seenContentIds);
    if (target.requiresSeenIds.every((id) => seen.has(id))) {
      target.grantsEvidenceIds.forEach((id) => recordObservation(id));
    }
  }, [gameState.seenContentIds, recordObservation, gameData]);

  const submitReport = useCallback(
    (answers) => {
      if (!canSubmitReport(stateRef.current, gameData)) {
        const missingClueCount = gameData.evidence.length - stateRef.current.observedMaterialIds.length;
        const result = {
          allCorrect: false,
          incomplete: true,
          missingClueCount,
          wrongQuestionIds: [],
          hints: [`还需找到 ${missingClueCount} 条线索，收集完整后才能提交结论。`],
        };
        showToast(result.hints[0]);
        return result;
      }
      const result = gradeReport(answers, gameData);
      const completedAt = Date.now();
      let reward = 0;
      let elapsedSeconds = null;
      applyState((prev) => {
        const firstCompletion = result.allCorrect && !prev.endingUnlocked;
        if (firstCompletion) {
          const startedAt = prev.investigationStartedAt || completedAt;
          elapsedSeconds = Math.max(0, Math.round((completedAt - startedAt) / 1000));
          reward = calculateCompletionReward(
            elapsedSeconds,
            gameData.settlement.rewardConfig,
            prev.observedMaterialIds.length,
            gameData.evidence.length
          );
        }
        return {
          ...prev,
          reportAnswers: answers,
          reportSubmitCount: (prev.reportSubmitCount || 0) + 1,
          endingUnlocked: result.allCorrect || prev.endingUnlocked,
          points: (prev.points || 0) + reward,
          completionReward: firstCompletion ? reward : prev.completionReward,
          completionElapsedSeconds: firstCompletion
            ? elapsedSeconds
            : prev.completionElapsedSeconds,
        };
      });
      // 全部答对：自动进入结案结算页
      if (result.allCorrect) setScreen('settlement');
      return { ...result, reward, elapsedSeconds };
    },
    [applyState, showToast]
  );

  // 结束本次值班：清空进度，回到登录页，可重新登录重玩
  const endGame = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 忽略存储异常。
    }
    applyState({ ...gameData.initialState });
    setScreen('login');
    setOpenAppId(null);
    setMaterialDetailId(null);
  }, [applyState]);

  const openApp = useCallback(
    (appId) => {
      const app = gameData.phone.apps.find((item) => item.id === appId);
      if (!app) return;
      if (app.kind === 'system') {
        showToast(gameData.phone.irrelevantAppToast);
        return;
      }
      setOpenAppId(appId);
    },
    [showToast]
  );

  const closeApp = useCallback(() => setOpenAppId(null), []);

  const value = useMemo(
    () => ({
      gameData,
      gameState,
      screen,
      openAppId,
      toast,
      materialDetailId,
      notify: showToast,
      startInvestigation,
      loginToSystem,
      backToCase,
      viewSettlement,
      endGame,
      openApp,
      closeApp,
      recordObservation,
      viewMaterial,
      dismissMaterialDetail,
      markSeen,
      purchaseHint,
      submitReport,
    }),
    [
      gameState, screen, openAppId, toast, materialDetailId, showToast,
      startInvestigation, loginToSystem, backToCase, viewSettlement, endGame,
      openApp, closeApp, recordObservation,
      viewMaterial, dismissMaterialDetail, markSeen, submitReport,
      purchaseHint,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame 必须在 GameProvider 内使用');
  return context;
}
