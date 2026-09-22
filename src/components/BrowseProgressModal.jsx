import { useGame } from '../game/GameContext.jsx';
import { getBrowseProgress } from '../game/engine.js';

// 浏览记录不展示线索数量，也不参与结案；它只帮玩家回顾探索范围。
export default function BrowseProgressModal({ onClose }) {
  const { gameData, gameState } = useGame();
  const progress = getBrowseProgress(gameState, gameData);

  return (
    <div
      className="case-detail-overlay browse-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="浏览记录"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="case-detail-panel browse-panel">
        <header className="case-detail-head">
          <div>
            <div className="case-detail-kicker">EXPLORATION LOG</div>
            <h2>浏览记录</h2>
          </div>
          <button className="case-detail-close" onClick={onClose} aria-label="关闭浏览记录">✕</button>
        </header>
        <div className="browse-body">
          <div className="browse-summary">
            <div>
              <span>信息浏览程度</span>
              <strong className="browse-progress-percent">{progress.percent}%</strong>
            </div>
            <p>{progress.complete ? '所有可浏览信息均已打开。' : '仍有信息尚未打开，可按需要继续探索。'}</p>
            <div className="browse-progress-track" aria-label={`信息浏览程度 ${progress.percent}%`}>
              <span style={{ width: `${progress.percent}%` }} />
            </div>
          </div>

          <div className="browse-group-list">
            {progress.groups.map((group) => (
              <div className="browse-group" key={group.id}>
                <div className="browse-group-head">
                  <b>{group.label}</b>
                  <span>{group.complete ? '已全部浏览' : '尚有内容未浏览'}</span>
                </div>
                <div className="browse-progress-track small" aria-label={`${group.label} ${group.percent}%`}>
                  <span style={{ width: `${group.percent}%` }} />
                </div>
              </div>
            ))}
          </div>

          <p className="browse-note">浏览记录包含与案件无关的日常信息；它不会影响结案，结案仍需要找齐所有关键线索。</p>
        </div>
      </section>
    </div>
  );
}
