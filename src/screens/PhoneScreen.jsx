import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/GameContext.jsx';
import AppView from '../components/AppView.jsx';
import CaseDetailModal from '../components/CaseDetailModal.jsx';
import ConclusionModal from '../components/ConclusionModal.jsx';
import EvidencePopups from '../components/EvidencePopups.jsx';
import BrowseProgressModal from '../components/BrowseProgressModal.jsx';
import { getBrowseProgress, getEvidenceProgress } from '../game/engine.js';

// 手机桌面：亮色壁纸 + 华为经典风（时钟卡片 + 4 列图标网格）
// 翻页：底部三键导航 ◀ ● ▶ 或左右滑动或页面指示点
function HomePages({ backRef, forwardRef, homeRef }) {
  const { gameData, openApp } = useGame();
  const { statusBar } = gameData.phone;
  const [page, setPage] = useState(1);
  const pageApps = gameData.phone.apps.filter((app) => !app.dock);
  const dockApps = gameData.phone.apps.filter((app) => app.dock);
  const pageCount = Math.max(...pageApps.map((a) => a.page || 1));

  const renderAppIcon = (app, dock = false) => (
    <button
      key={app.id}
      className={`app-icon ${dock ? 'dock-app-icon' : ''}`}
      onClick={() => openApp(app.id)}
    >
      <span className="app-icon-image">
        {app.icon}
      </span>
      <span className="app-icon-name">{app.name}</span>
    </button>
  );

  // 滑动切页（鼠标拖动同样有效）
  const swipe = useRef(null);
  const onPointerDown = (e) => {
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e) => {
    if (!swipe.current) return;
    const dx = e.clientX - swipe.current.x;
    const dy = e.clientY - swipe.current.y;
    swipe.current = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) setPage((p) => Math.min(p + 1, pageCount));
      else setPage((p) => Math.max(p - 1, 1));
    }
  };

  // 供三键导航调用（保持与滑动一致的状态更新）
  const goPrev = () => setPage((p) => Math.max(p - 1, 1));
  const goNext = () => setPage((p) => Math.min(p + 1, pageCount));
  const goHome = () => setPage(1);
  useEffect(() => {
    backRef.current = goPrev;
    forwardRef.current = goNext;
    homeRef.current = goHome;
  });

  return (
    <div
      className="phone-home"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      style={{ backgroundImage: `url(${statusBar.wallpaper})` }}
    >
      <div className="home-pages" style={{ transform: `translateX(${-(page - 1) * 100}%)` }}>
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
          <div className="home-page" key={p}>
            {p === 1 && (
              <div className="home-widget-card">
                <div className="widget-time">{statusBar.time}</div>
                <div className="widget-sub">
                  <span>{statusBar.date}</span>
                  <span className="widget-weather">{statusBar.weather}</span>
                </div>
              </div>
            )}
            <div className="page-grid">
              {pageApps
                .filter((a) => (a.page || 1) === p)
                .map((app) => renderAppIcon(app))}
            </div>
          </div>
        ))}
      </div>
      <div className="page-dots">
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            className={`page-dot ${page === p ? 'active' : ''}`}
            onClick={() => setPage(p)}
            aria-label={`第 ${p} 页`}
          />
        ))}
      </div>
      <div className="home-dock" aria-label="常驻应用">
        {dockApps.map((app) => renderAppIcon(app, true))}
      </div>
    </div>
  );
}

// 老式三键导航栏：◀ 返回(应用内关闭应用/桌面上一页) ● 回主屏 ▶ 下一页
function NavKeys({ onBack, onHome, onForward, forwardDisabled, inApp }) {
  return (
    <div className={`nav-bar ${inApp ? 'in-app' : ''}`}>
      <button
        className="nav-key nav-back"
        onClick={onBack}
        aria-label="返回"
        title="返回 / 上一页"
      >
        ◀
      </button>
      <button className="nav-key nav-home" onClick={onHome} aria-label="回到主屏幕" title="回到主屏幕">
        ●
      </button>
      <button
        className="nav-key nav-forward"
        onClick={onForward}
        disabled={forwardDisabled}
        aria-label="下一页"
        title="下一页"
      >
        ▶
      </button>
    </div>
  );
}

export default function PhoneScreen() {
  const {
    gameData, gameState, openAppId, closeApp, toast, purchaseHint, restartInvestigation,
  } = useGame();
  const { phone } = gameData;
  const { statusBar } = phone;
  const openAppData = phone.apps.find((app) => app.id === openAppId);
  const inApp = Boolean(openAppData);

  // 桌面翻页动作（由 HomePages 注册，三键导航调用）
  const backRef = useRef(null);
  const forwardRef = useRef(null);
  const homeRef = useRef(null);

  // 案件详情是调查员工作区，不伪装成手机 App。
  const [caseDetailOpen, setCaseDetailOpen] = useState(false);
  const [conclusionOpen, setConclusionOpen] = useState(false);
  const [hintResult, setHintResult] = useState(null);
  // 调查说明书（通关条件说明）弹层
  const [guideOpen, setGuideOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false);
  const [completionNoticeOpen, setCompletionNoticeOpen] = useState(false);
  const guide = gameData.guide;

  // Esc 关闭案件档案 / 说明书弹层
  useEffect(() => {
    if (!caseDetailOpen && !conclusionOpen && !guideOpen && !hintResult && !browseOpen && !restartConfirmOpen) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setCaseDetailOpen(false);
      setConclusionOpen(false);
      setGuideOpen(false);
      setHintResult(null);
      setBrowseOpen(false);
      setRestartConfirmOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [caseDetailOpen, conclusionOpen, guideOpen, hintResult, browseOpen, restartConfirmOpen]);

  const {
    complete: cluesComplete,
  } = getEvidenceProgress(gameState, gameData);
  const browseProgress = getBrowseProgress(gameState, gameData);
  const previousCluesComplete = useRef(cluesComplete);

  // 收集最后一条关键线索时给予一次明确但不阻塞操作的完成反馈。
  useEffect(() => {
    const justCompleted = !previousCluesComplete.current && cluesComplete;
    previousCluesComplete.current = cluesComplete;
    if (!justCompleted) return undefined;
    setCompletionNoticeOpen(true);
    const timer = window.setTimeout(() => setCompletionNoticeOpen(false), 4200);
    return () => window.clearTimeout(timer);
  }, [cluesComplete]);

  const handlePurchaseHint = () => {
    const result = purchaseHint();
    if (result.ok) setHintResult(result.clue);
  };

  const handleBack = () => {
    if (inApp) closeApp();
    else backRef.current?.();
  };
  const handleForward = () => {
    if (!inApp) forwardRef.current?.();
  };

  return (
    <div className="phone-page">
      <div className="page-top-actions">
        <div className="desk-control-head">
          <div className="points-display">
            <span>调查积分</span>
            <strong>{gameState.points}</strong>
          </div>
          <button
            className="guide-trigger"
            onClick={() => setGuideOpen(true)}
            aria-label={guide.title}
            title={guide.title}
          >
            📖
          </button>
        </div>
        <div className="desk-control-row">
          <button className="browse-trigger" onClick={() => setBrowseOpen(true)}>
            <span>浏览记录</span>
            <b>已浏览 {browseProgress.percent}% 的信息</b>
            <i><em style={{ width: `${browseProgress.percent}%` }} /></i>
          </button>
          <button
            className={`case-detail-trigger ${cluesComplete ? 'is-complete' : ''}`}
            onClick={() => setCaseDetailOpen(true)}
          >
            <span>线索进度</span>
            <b>{cluesComplete ? '✓ 关键证据链已完整' : '继续核对关键事实'}</b>
          </button>
        </div>
        <button className="hint-trigger" onClick={handlePurchaseHint}>
          <span>💡 获取线索提示</span>
          <b>消耗 100 调查积分</b>
        </button>
        <div className="desk-primary-action">
          <button
            className={`conclusion-trigger ${cluesComplete ? 'is-ready' : ''}`}
            onClick={() => setConclusionOpen(true)}
            disabled={!cluesComplete}
            title={cluesComplete ? '提交调查结论' : '关键线索尚未齐全'}
          >
            <span>{cluesComplete ? '✓ 提交调查结论' : '提交结论'}</span>
            <b>{cluesComplete ? '关键线索已齐全，可以结案' : '找齐关键线索后解锁'}</b>
          </button>
        </div>
      </div>
      <div className={`phone-frame ${inApp ? 'in-app' : ''}`}>
        <div className="phone-status-bar">
          <span className="status-time">{statusBar.time}</span>
          <span className="status-right">
            <span className="status-network">◉◉◉ {statusBar.network}</span>
            <span className="status-battery">{statusBar.batteryPercent}% ▰</span>
          </span>
        </div>

        {inApp ? (
          <AppView app={openAppData} onClose={closeApp} />
        ) : (
          <HomePages backRef={backRef} forwardRef={forwardRef} homeRef={homeRef} />
        )}

        <NavKeys
          onBack={handleBack}
          onHome={() => {
            closeApp();
            // 回主屏：切回第 1 页
            homeRef.current?.();
          }}
          onForward={handleForward}
          forwardDisabled={inApp}
          inApp={inApp}
        />

        {toast && <div className="toast">{toast}</div>}

        <EvidencePopups />

      </div>
      {caseDetailOpen && <CaseDetailModal onClose={() => setCaseDetailOpen(false)} />}
      {conclusionOpen && <ConclusionModal onClose={() => setConclusionOpen(false)} />}
      {browseOpen && <BrowseProgressModal onClose={() => setBrowseOpen(false)} />}

      <button
        className="restart-trigger"
        onClick={() => setRestartConfirmOpen(true)}
        aria-label="重新开始调查"
        title="重新开始调查"
      >
        ↻
      </button>

      {completionNoticeOpen && (
        <div className="completion-notice" role="status">
          <span>✓</span>
          <div>
            <b>关键证据链已完整</b>
            <small>现在可以提交调查结论了</small>
          </div>
          <button onClick={() => setCompletionNoticeOpen(false)} aria-label="关闭完成提示">✕</button>
        </div>
      )}

      {restartConfirmOpen && (
        <div className="guide-overlay restart-overlay" role="dialog" aria-modal="true" aria-label="确认重新开始">
          <div className="restart-confirm-card">
            <span className="restart-confirm-icon">↻</span>
            <h2>重新开始调查？</h2>
            <p>这会清除当前的线索、积分、浏览记录和结案进度，并回到身份登录页面。</p>
            <div className="restart-confirm-actions">
              <button onClick={() => setRestartConfirmOpen(false)}>取消</button>
              <button className="restart-confirm-accept" onClick={restartInvestigation}>清除进度并重新开始</button>
            </div>
          </div>
        </div>
      )}

      {hintResult && (
        <div className="hint-result" role="status">
          <button onClick={() => setHintResult(null)} aria-label="关闭提示">✕</button>
          <span>已兑换线索位置</span>
          <b>{hintResult.timelineTime} · {hintResult.hint}</b>
          <small>该提示已同步到“线索进度”对应时段。</small>
        </div>
      )}

      {/* 调查说明书弹层：通关条件说明 */}
      {guideOpen && (
        <div
          className="guide-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={guide.title}
          onClick={(event) => {
            if (event.target === event.currentTarget) setGuideOpen(false);
          }}
        >
          <div className="guide-card">
            <header className="guide-head">
              <h2>
                {guide.icon} {guide.title}
              </h2>
              <button
                className="guide-close"
                onClick={() => setGuideOpen(false)}
                aria-label="关闭说明书"
              >
                ✕
              </button>
            </header>
            <ol className="guide-list">
              {guide.items.map((item) => (
                <li className="guide-item" key={item.title}>
                  <span className="guide-item-icon">{item.icon}</span>
                  <div>
                    <b>{item.title}</b>
                    <p>{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="guide-footer">{guide.footer}</p>
            <button className="guide-start-btn" onClick={() => setGuideOpen(false)}>
              {guide.startButtonLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
