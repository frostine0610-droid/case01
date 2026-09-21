import { useGame } from '../game/GameContext.jsx';

// 线索详情弹层：只解释玩家已经查看到的内容，说明它在时间线中的含义。
export default function EvidencePopups() {
  const { gameData, gameState, materialDetailId, dismissMaterialDetail } = useGame();

  if (!materialDetailId) return null;
  const material = gameData.evidence.find((item) => item.id === materialDetailId);
  if (!material || !gameState.observedMaterialIds.includes(material.id)) return null;

  return (
    <div
      className="evidence-modal"
      role="dialog"
      aria-modal="true"
      aria-label="线索详情"
      onClick={(event) => event.target === event.currentTarget && dismissMaterialDetail()}
    >
      <div className="evidence-modal-card">
        <h3 className="evidence-detail-title">线索详情</h3>
        <div className="evidence-detail-head">
          <span className="evidence-type-tag">已记录线索</span>
          <b>{material.title}</b>
        </div>
        <dl className="evidence-detail-rows">
          <div className="evidence-detail-row">
            <dt>时间</dt>
            <dd>{material.timelineTime}</dd>
          </div>
          <div className="evidence-detail-row">
            <dt>来源</dt>
            <dd>{material.sourceLabel}</dd>
          </div>
          <div className="evidence-detail-row">
            <dt>发现</dt>
            <dd>{material.summary}</dd>
          </div>
        </dl>
        <p className="evidence-detail-conclusion">{material.playerConclusion}</p>
        <div className="evidence-modal-actions">
          <button className="evidence-modal-confirm" onClick={dismissMaterialDetail}>关闭</button>
        </div>
      </div>
    </div>
  );
}
