const VALID_SCREENS = new Set(['login', 'briefing', 'phone', 'settlement']);

function finiteNumber(value, fallback, { min = 0, integer = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const normalized = Math.max(min, number);
  return integer ? Math.floor(normalized) : normalized;
}

function nullableNumber(value, fallback = null) {
  if (value == null) return fallback;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function uniqueStrings(value, allowedIds = null) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item) => (
    typeof item === 'string' && (!allowedIds || allowedIds.has(item))
  )))];
}

function sanitizeAnswers(value, gameData) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(gameData.conclusionReport.questions.flatMap((question) => {
    const selected = value[question.id];
    const valid = question.options.some((option) => option.id === selected);
    return valid ? [[question.id, selected]] : [];
  }));
}

export function sanitizeGameState(value, gameData) {
  const initial = gameData.initialState;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...initial };
  }

  const evidenceIds = new Set(gameData.evidence.map((item) => item.id));
  return {
    ...initial,
    points: finiteNumber(value.points, initial.points, { min: 0, integer: true }),
    investigationStartedAt: nullableNumber(value.investigationStartedAt),
    completionElapsedSeconds: nullableNumber(value.completionElapsedSeconds),
    completionReward: finiteNumber(value.completionReward, 0, { min: 0, integer: true }),
    hintedMaterialIds: uniqueStrings(value.hintedMaterialIds, evidenceIds),
    observedMaterialIds: uniqueStrings(value.observedMaterialIds, evidenceIds),
    seenContentIds: uniqueStrings(value.seenContentIds),
    reportAnswers: sanitizeAnswers(value.reportAnswers, gameData),
    reportSubmitCount: finiteNumber(value.reportSubmitCount, 0, { min: 0, integer: true }),
    endingUnlocked: value.endingUnlocked === true,
  };
}

export function sanitizeScreen(value, state, gameData) {
  const fallback = gameData.game.startScreenId || 'login';
  if (!VALID_SCREENS.has(value)) return fallback;
  if (value === 'settlement' && !state.endingUnlocked) return 'phone';
  return value;
}

export function loadSavedSession(storage, storageKey, saveVersion, gameData) {
  try {
    const raw = storage?.getItem(storageKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== saveVersion || !data.gameState) {
      storage?.removeItem(storageKey);
      return null;
    }
    const gameState = sanitizeGameState(data.gameState, gameData);
    return {
      v: saveVersion,
      gameState,
      screen: sanitizeScreen(data.screen, gameState, gameData),
    };
  } catch {
    try {
      storage?.removeItem(storageKey);
    } catch {
      // 存储不可写时保持无存档启动。
    }
    return null;
  }
}
