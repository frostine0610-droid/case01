import { useMemo, useState } from 'react';
import { useGame } from '../../game/GameContext.jsx';

// 时间线单条已记录线索
function TimelineItem({ item, onOpen }) {
  return (
    <li className="timeline-item">
      <span className="timeline-node found" aria-hidden="true" />
      <div className="timeline-card">
        <div className="timeline-card-head">
          <span className="timeline-time">{item.timelineTime}</span>
        </div>
        <button className="timeline-main" onClick={() => onOpen(item.id)}>
          <p className="timeline-desc">{item.timelineDesc}</p>
          <small className="timeline-source">{item.sourceLabel}</small>
        </button>
      </div>
    </li>
  );
}

// 未确认内容只显示概括提示；兑换过位置提示时才显示相应位置。
function TimelineHint({ clue = null }) {
  return (
    <li className="timeline-item blank">
      <span className="timeline-node" aria-hidden="true" />
      <div className="timeline-card">
        <div className="timeline-card-head">
          <span className="timeline-time">待核对</span>
        </div>
        <div className="timeline-main">
          <p className="timeline-desc">该时段仍有关键事实尚未确认</p>
          {clue ? (
            <p className="timeline-hint">
              <span className="timeline-hint-label">💡 已兑换的位置提示</span>
              {clue.hint}
            </p>
          ) : (
            <p className="timeline-hint locked">使用屏幕外的“线索提示”兑换具体位置</p>
          )}
        </div>
      </div>
    </li>
  );
}

// 调查工作台：
// 按时间段分组展示线索收集进度，并合并案件详情中的已收集线索。
export default function InvestigationApp() {
  const { gameData, gameState, viewMaterial } = useGame();
  const { uiText } = gameData;

  const allClues = useMemo(
    () =>
      [...gameData.evidence].sort((a, b) => (a.timelineOrder || 0) - (b.timelineOrder || 0)),
    [gameData.evidence]
  );
  const foundIds = useMemo(
    () => new Set(gameState.observedMaterialIds),
    [gameState.observedMaterialIds]
  );

  // 分组：按 clueGroups 定义的时间段组织线索
  const groups = useMemo(
    () =>
      [...(gameData.clueGroups || [])]
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((g) => ({ ...g, clues: allClues.filter((c) => c.timeGroup === g.id) })),
    [gameData.clueGroups, allClues]
  );

  // 默认展开第一个还有未收集线索的分组
  const [openGroupId, setOpenGroupId] = useState(() => {
    const firstIncomplete = groups.find((g) => g.clues.some((c) => !foundIds.has(c.id)));
    return firstIncomplete?.id || groups[0]?.id || null;
  });

  const hintedIds = new Set(gameState.hintedMaterialIds || []);

  return (
    <div className="investigation investigation-progress">
      <div className="inv-page-intro">
        <div className="inv-intro-head">
          <div>
            <h3>{uiText.timelineTitle}</h3>
            <p>{uiText.timelineIntro}</p>
          </div>
        </div>
      </div>

      <div className="inv-groups">
        {groups.map((group) => {
          const foundClues = group.clues.filter((clue) => foundIds.has(clue.id));
          const missingClues = group.clues.filter((clue) => !foundIds.has(clue.id));
          const hintedClues = missingClues.filter((clue) => hintedIds.has(clue.id));
          const hasUnhintedClues = missingClues.some((clue) => !hintedIds.has(clue.id));
          const open = openGroupId === group.id;
          return (
            <div className={`inv-group ${open ? 'open' : ''}`} key={group.id}>
              <button
                className="inv-group-head"
                onClick={() => setOpenGroupId(open ? null : group.id)}
                aria-expanded={open}
              >
                <span className="inv-group-label">{group.label}</span>
                <span
                  className={`inv-group-count ${
                    missingClues.length === 0 && group.clues.length > 0 ? 'done' : ''
                  }`}
                >
                  {missingClues.length === 0 ? '关键事实已确认' : '仍有待核对信息'}
                </span>
                <span className="inv-group-arrow" aria-hidden="true">
                  {open ? '⌃' : '⌄'}
                </span>
              </button>
              {open && (
                <ul className="timeline-list">
                  {foundClues.map((clue) => (
                    <TimelineItem key={clue.id} item={clue} onOpen={viewMaterial} />
                  ))}
                  {hintedClues.map((clue) => <TimelineHint key={clue.id} clue={clue} />)}
                  {hasUnhintedClues && <TimelineHint />}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
