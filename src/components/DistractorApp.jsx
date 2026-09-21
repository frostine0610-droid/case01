import { useState } from 'react';
import { useGame } from '../game/GameContext.jsx';

// 日历：月视图 + 近期日程（今日描边、事发日高亮）
function CalendarView({ data }) {
  const cells = [
    ...Array.from({ length: data.leadBlanks }, () => null),
    ...Array.from({ length: data.daysInMonth }, (_, i) => i + 1),
  ];
  return (
    <div className="dist-app">
      <div className="cal-month">{data.monthLabel}</div>
      <div className="cal-grid">
        {data.weekdays.map((w) => (
          <span className="cal-weekday" key={w}>
            {w}
          </span>
        ))}
        {cells.map((day, i) => (
          <span
            key={i}
            className={[
              'cal-day',
              day === data.todayDay ? 'is-today' : '',
              day === data.highlight?.day ? 'is-highlight' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            title={day === data.highlight?.day ? data.highlight.label : undefined}
          >
            {day ?? ''}
          </span>
        ))}
      </div>
      {data.highlight && (
        <div className="cal-highlight-note">
          {data.highlight.day} 日 · {data.highlight.label}
        </div>
      )}
      <div className="dist-section-title">{data.eventsTitle}</div>
      <ul className="cal-events">
        {data.events.map((e, i) => (
          <li key={i}>
            <b>{e.title}</b>
            <span>{e.date}</span>
            <em>{e.detail}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 时钟：当前时间 + 闹钟列表（开关可点击）
function ClockView({ data }) {
  const [alarms, setAlarms] = useState(data.alarms);
  const toggle = (i) =>
    setAlarms((list) => list.map((a, j) => (j === i ? { ...a, enabled: !a.enabled } : a)));
  return (
    <div className="dist-app">
      <div className="clock-big">{data.bigTime}</div>
      <div className="clock-date">{data.dateLabel}</div>
      <div className="dist-section-title">{data.alarmTitle}</div>
      <ul className="alarm-list">
        {alarms.map((a, i) => (
          <li key={i} className={a.enabled ? '' : 'off'}>
            <div className="alarm-info">
              <b>{a.time}</b>
              <span>{a.label}</span>
            </div>
            <button
              className={`alarm-switch ${a.enabled ? 'on' : ''}`}
              onClick={() => toggle(i)}
              role="switch"
              aria-checked={a.enabled}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

// 备忘录：笔记列表 → 笔记详情
function NotesView({ data }) {
  const [openId, setOpenId] = useState(null);
  const note = data.notes.find((n) => n.id === openId);

  if (note) {
    return (
      <div className="dist-app">
        <button className="dist-back" onClick={() => setOpenId(null)}>
          ← 备忘录
        </button>
        <h3 className="note-title">{note.title}</h3>
        <ul className="note-lines">
          {note.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="dist-app">
      <ul className="note-list">
        {data.notes.map((n) => (
          <li key={n.id}>
            <button className="note-item" onClick={() => setOpenId(n.id)}>
              <b>{n.title}</b>
              <span>{n.preview}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 快递：包裹列表 → 物流时间线
function ExpressView({ data }) {
  const [openId, setOpenId] = useState(null);
  const pkg = data.packages.find((p) => p.id === openId);

  if (pkg) {
    return (
      <div className="dist-app">
        <button className="dist-back" onClick={() => setOpenId(null)}>
          ← 快递
        </button>
        <div className="pkg-head">
          <b>{pkg.name}</b>
          <span className={`pkg-status ${pkg.statusType}`}>{pkg.status}</span>
        </div>
        <div className="pkg-company">{pkg.company}</div>
        <ol className="pkg-timeline">
          {pkg.timeline.map((t, i) => (
            <li key={i}>
              <b>{t.time}</b>
              <span>{t.text}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="dist-app">
      <ul className="pkg-list">
        {data.packages.map((p) => (
          <li key={p.id}>
            <button className="pkg-item" onClick={() => setOpenId(p.id)}>
              <span className="pkg-item-icon">📦</span>
              <span className="pkg-item-info">
                <b>{p.name}</b>
                <em>{p.company}</em>
              </span>
              <span className={`pkg-status ${p.statusType}`}>{p.status}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const DIST_VIEWS = {
  calendar: CalendarView,
  clock: ClockView,
  notes: NotesView,
  express: ExpressView,
};

// 干扰应用：与案情无关的日常应用，内容全部由 content.distractors 数据驱动
export default function DistractorApp({ app }) {
  const { gameData } = useGame();
  const data = gameData.content.distractors?.[app.id];
  const View = DIST_VIEWS[app.id];

  if (!View || !data) {
    return (
      <div className="app-placeholder">
        <div className="app-placeholder-title">{app.name}</div>
        <p>没有找到该应用的内容数据。</p>
      </div>
    );
  }

  return <View data={data} />;
}
