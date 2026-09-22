import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../game/GameContext.jsx';
import { calculateInvestigationRating, getEvidenceProgress } from '../game/engine.js';

// 数字滚动动画：从 0 数到目标值
function CountUp({ target, duration = 900 }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // easeOut：先快后慢
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return <>{value}</>;
}

// 结算页：调查结束后的全屏结案报告
// 动画流程：金色光晕亮起 → “已结案”印章盖下 → 统计数字滚动 → 评级揭示 → 真相时间线逐条浮现
export default function SettlementScreen() {
  const { gameData, gameState, endGame, backToCase } = useGame();
  const settlement = gameData.settlement;
  const ending = gameData.ending;
  const submits = gameState.reportSubmitCount || 0;
  const hintCount = new Set(gameState.hintedMaterialIds || []).size;
  const reward = gameState.completionReward || 0;
  // 线索统计与其他统计卡一致：显示实际收集数量（结案门槛保证已全部收集）
  const clueProgress = getEvidenceProgress(gameState, gameData);
  const elapsedSeconds = gameState.completionElapsedSeconds;
  const rewardTier = settlement.rewardConfig.tiers.find(
    (tier) => elapsedSeconds != null && elapsedSeconds <= tier.maxSeconds
  );
  const rewardLabel = rewardTier?.label || settlement.rewardConfig.fallbackLabel;

  const rating = useMemo(() => calculateInvestigationRating({
    submitCount: submits,
    hintCount,
    elapsedSeconds,
  }, settlement.ratingConfig), [submits, hintCount, elapsedSeconds, settlement.ratingConfig]);

  const truthTimeline = useMemo(
    () => [...gameData.evidence].sort((a, b) => (a.timelineOrder || 0) - (b.timelineOrder || 0)),
    [gameData.evidence]
  );

  const ratingInfo = settlement.ratingLevels[rating];

  return (
    <div className="settlement-page">
      <div className="settlement-glow" aria-hidden="true" />
      <div className="settlement-body">
        {/* 报告头 + 印章 */}
        <header className="settlement-head">
          <span className="settlement-kicker">{settlement.kicker}</span>
          <h1 className="settlement-title">{settlement.title}</h1>
          <div className="settlement-result">{settlement.resultTitle}</div>
          <div className="settlement-stamp" aria-hidden="true">
            {settlement.stampText}
          </div>
        </header>

        <div className="settlement-dashboard">
          {/* 统计 + 评级 */}
          <section className="settlement-stats">
            <h2 className="settlement-section-title">{settlement.statsTitle}</h2>
            <div className={`settlement-rating r-${rating}`}>
              <div className="settlement-rating-badge">{rating}</div>
              <div className="settlement-rating-info">
                <small>{settlement.ratingTitle}</small>
                <b>{ratingInfo.label}</b>
                <span>{ratingInfo.desc}</span>
              </div>
            </div>
            <div className="settlement-stat-grid">
              <div className="settlement-stat">
                <b><CountUp target={clueProgress.found} duration={600} /></b>
                <span>{settlement.statLabels.clues}</span>
                <small>{settlement.statUnits.clues}</small>
              </div>
              <div className="settlement-stat settlement-reward-stat">
                <b>+<CountUp target={reward} duration={700} /></b>
                <span>{settlement.statLabels.reward}</span>
                <small>{rewardLabel}</small>
              </div>
              <div className="settlement-stat">
                <b><CountUp target={submits} duration={600} /></b>
                <span>{settlement.statLabels.submits}</span>
                <small>{settlement.statUnits.submits}</small>
              </div>
              <div className="settlement-stat">
                <b><CountUp target={hintCount} duration={500} /></b>
                <span>{settlement.statLabels.hints}</span>
                <small>{settlement.statUnits.hints}</small>
              </div>
            </div>
          </section>

          {/* 真相时间线：逐条浮现 */}
          <section className="settlement-timeline">
            <h2 className="settlement-section-title">{settlement.timelineTitle}</h2>
            <ul>
              {truthTimeline.map((item, i) => (
                <li style={{ animationDelay: `${0.9 + i * 0.14}s` }} key={item.id}>
                  <span className="st-time">{item.timelineTime}</span>
                  <span className="st-desc">{item.timelineDesc}</span>
                </li>
              ))}
            </ul>
            <div className="settlement-final-message">
              <span className="settlement-final-sender">{ending.finalMessage.sender}：</span>
              {ending.finalMessage.text}
            </div>
          </section>
        </div>

        {/* 操作：返回手机 / 结束调查 */}
        <footer className="settlement-actions">
          <button className="settlement-back-btn" onClick={backToCase}>
            ← {settlement.backButtonLabel}
          </button>
          <button className="settlement-end-btn" onClick={endGame}>
            ⏻ {settlement.endButtonLabel}
          </button>
          <p className="settlement-end-hint">{settlement.endHint}</p>
        </footer>
      </div>
    </div>
  );
}
