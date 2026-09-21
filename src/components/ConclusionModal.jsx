import { useEffect } from 'react';
import { useGame } from '../game/GameContext.jsx';
import ReportForm from './ReportForm.jsx';

export default function ConclusionModal({ onClose }) {
  const { submitReport } = useGame();

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="case-detail-overlay conclusion-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="提交结论"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="case-detail-panel conclusion-panel">
        <header className="case-detail-head">
          <div>
            <span className="case-detail-kicker">CASE 01</span>
            <h2>提交调查结论</h2>
          </div>
          <button className="case-detail-close" onClick={onClose} aria-label="关闭提交结论">
            ✕
          </button>
        </header>
        <div className="case-detail-body">
          <ReportForm onSubmit={submitReport} embedded />
        </div>
      </section>
    </div>
  );
}
