import { useEffect, useState } from 'react';
import VideoBriefing from './VideoBriefing.jsx';
import InvestigationApp from './apps/InvestigationApp.jsx';

// 案件详情只展示线索进度并支持重播案件引入；提交结论是屏幕外的独立入口。
export default function CaseDetailModal({ onClose }) {
  const [tab, setTab] = useState('progress'); // 'progress' | 'replay'

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="case-detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="案件详情"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="case-detail-panel">
        <header className="case-detail-head">
          <div>
            <span className="case-detail-kicker">CASE 01</span>
            <h2>消失的相机 · 案件详情</h2>
          </div>
          <button
            className="case-briefing-link"
            onClick={() => setTab((current) => current === 'replay' ? 'progress' : 'replay')}
          >
            {tab === 'replay' ? '返回调查' : '重播案件引入'}
          </button>
          <button className="case-detail-close" onClick={onClose} aria-label="关闭案件详情">
            ✕
          </button>
        </header>
        <div className={`case-detail-body ${tab === 'replay' ? 'replay-mode' : ''}`}>
          {tab === 'replay' ? (
            <VideoBriefing onStart={onClose} />
          ) : (
            <InvestigationApp />
          )}
        </div>
      </section>
    </div>
  );
}
