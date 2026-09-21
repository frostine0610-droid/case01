import { useState } from 'react';
import { useGame } from '../game/GameContext.jsx';

// 最终报告：三道单选题。答错显示指向性提示，可修改重交；全对自动进入结算页。
export default function ReportForm({ onSubmit, embedded = false }) {
  const { gameData, gameState, viewSettlement } = useGame();
  const report = gameData.conclusionReport;
  const ending = gameData.ending;
  const [answers, setAnswers] = useState({ ...(gameState.reportAnswers || {}) });
  const [result, setResult] = useState(null);

  const selectOption = (questionId, optionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    setResult(null);
  };

  const allAnswered = report.questions.every((q) => answers[q.id]);
  const cluesComplete = gameData.evidence.every((item) =>
    gameState.observedMaterialIds.includes(item.id)
  );

  // ---- 结案卡：显示结局摘要 + 真相时间线，可再入结算页 ----
  if (gameState.endingUnlocked) {
    const truthTimeline = [...gameData.evidence].sort(
      (a, b) => (a.timelineOrder || 0) - (b.timelineOrder || 0)
    );
    return (
      <div className="report-card ending-card embedded-report">
        <div className="ending-badge">✓ 调查完成</div>
        <h2 className="ending-title">{ending.title}</h2>
        <div className="ending-paragraphs">
          {ending.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>

        <div className="ending-timeline">
          <h3 className="ending-timeline-title">真相时间线</h3>
          <ul className="ending-timeline-list">
            {truthTimeline.map((item) => (
              <li className="ending-timeline-item" key={item.id}>
                <span className="ending-timeline-time">{item.timelineTime}</span>
                <span className="ending-timeline-desc">{item.timelineDesc}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="ending-message">
          <span className="ending-sender">{ending.finalMessage.sender}：</span>
          <span>{ending.finalMessage.text}</span>
        </div>
        <button className="ending-restart-btn" onClick={viewSettlement}>
          查看结案报告
        </button>
      </div>
    );
  }

  const content = (
    <div className={`report-card ${embedded ? 'embedded-report' : ''}`}>
      <div className="report-head">
        <div>
          <h2 className="report-title">{report.title}</h2>
          <p className="report-intro">{report.intro}</p>
        </div>
      </div>

      {result && !result.allCorrect && (
        <div className="report-wrong-hint">
          <b>还有问题没答对：</b>
          <ul>{result.hints.map((hint) => <li key={hint}>{hint}</li>)}</ul>
        </div>
      )}

      {!cluesComplete && (
        <div className="report-locked-note">
          尚未收集全部线索，暂时不能提交调查结论。
        </div>
      )}

      <div className="report-questions">
        {report.questions.map((question, index) => {
          const isWrong = result?.wrongQuestionIds.includes(question.id);
          const selected = answers[question.id];
          return (
            <section className={`report-q ${isWrong ? 'is-wrong' : ''}`} key={question.id}>
              <div className="report-q-prompt">
                <span className="report-q-num">{index + 1}</span>
                {question.prompt}
              </div>
              <div className="report-q-options">
                {question.options.map((option) => (
                  <button
                    className={`report-option ${selected === option.id ? 'selected' : ''}`}
                    key={option.id}
                    onClick={() => selectOption(question.id, option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <button
        className="report-submit-btn"
        onClick={() => setResult(onSubmit(answers))}
        disabled={!allAnswered || !cluesComplete}
      >
        {report.submitButtonLabel}
      </button>
    </div>
  );

  return embedded ? content : <div className="report-overlay">{content}</div>;
}
