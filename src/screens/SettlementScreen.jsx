import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../game/GameContext.jsx';

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
  const totalClues = gameData.evidence.length;
  const foundClues = gameState.observedMaterialIds.length;
  const submits = gameState.reportSubmitCount || 0;
  const reward = gameState.completionReward || 0;
  const elapsedSeconds = gameState.completionElapsedSeconds;
  const rewardTier = settlement.rewardConfig.tiers.find(
    (tier) => elapsedSeconds != null && elapsedSeconds <= tier.maxSeconds
  );
  const rewardLabel = rewardTier?.label || settlement.rewardConfig.fallbackLabel;

  // 评级：S = 全线索且一次提交；A = 线索过半且提交不超过 3 次；B = 其他
  const rating = useMemo(() => {
    if (foundClues === totalClues && submits <= 1) return 'S';
    if (foundClues >= Math.ceil(totalClues / 2) && submits <= 3) return 'A';
    return 'B';
  }, [foundClues, totalClues, submits]);

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

        {/* 统计 + 评级 */}
        <section className="settlement-stats">
          <h2 className="settlement-section-title">{settlement.statsTitle}</h2>
          <div className="settlement-stat-grid">
            <div className="settlement-stat">
              <b>
                <CountUp target={foundClues} />
                <i>/ {totalClues}</i>
              </b>
              <span>
                {settlement.statLabels.clues}（{settlement.statUnits.clues}）
              </span>
            </div>
            <div className="settlement-stat settlement-reward-stat">
              <b>
                +<CountUp target={reward} duration={700} />
              </b>
              <span>
                {settlement.statLabels.reward}（{rewardLabel}）
              </span>
            </div>
            <div className="settlement-stat">
              <b>
                <CountUp target={submits} duration={600} />
              </b>
              <span>
                {settlement.statLabels.submits}（{settlement.statUnits.submits}）
              </span>
            </div>
            <div className="settlement-stat">
              <b>
                <CountUp target={1} duration={500} />
              </b>
              <span>
                {settlement.statLabels.focus}（{settlement.statUnits.focus}）
              </span>
            </div>
          </div>

          <div className={`settlement-rating r-${rating}`}>
            <div className="settlement-rating-badge">{rating}</div>
            <div className="settlement-rating-info">
              <b>{ratingInfo.label}</b>
              <span>{ratingInfo.desc}</span>
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

        {/* 操作：返回案件 / 结束值班 */}
        <footer className="settlement-actions">
          <button className="settlement-end-btn" onClick={endGame}>
            ⏻ {settlement.endButtonLabel}
          </button>
          <button className="settlement-back-btn" onClick={backToCase}>
            ← {settlement.backButtonLabel}
          </button>
          <p className="settlement-end-hint">{settlement.endHint}</p>
        </footer>
      </div>
    </div>
  );
}
