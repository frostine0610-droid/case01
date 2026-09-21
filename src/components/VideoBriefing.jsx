import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/GameContext.jsx';

// 文案模板替换："{current} / {total}" → "1 / 5"
function formatText(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? vars[key] : `{${key}}`
  );
}

// 电影式案件开场：场景序列自动播放（图片 + Ken Burns 缓推 + 字幕淡入），
// 支持暂停/继续、跳过、重播；播放完显示“开始检查手机”
export default function VideoBriefing({ onStart }) {
  const { gameData } = useGame();
  const video = gameData.briefing.video;
  const scenes = video.scenes;

  const [sceneIndex, setSceneIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef(null);

  // 场景计时：duration 后切下一幕，最后一幕结束进入完成态
  useEffect(() => {
    if (!playing || finished) return undefined;
    const scene = scenes[sceneIndex];
    timerRef.current = setTimeout(() => {
      if (sceneIndex < scenes.length - 1) setSceneIndex((i) => i + 1);
      else setFinished(true);
    }, scene.duration);
    return () => clearTimeout(timerRef.current);
  }, [playing, sceneIndex, finished, scenes]);

  const skip = () => {
    clearTimeout(timerRef.current);
    setFinished(true);
  };
  const replay = () => {
    setSceneIndex(0);
    setPlaying(true);
    setFinished(false);
  };
  const togglePlay = () => {
    if (!finished) setPlaying((v) => !v);
  };

  // ---- 播放结束：任务卡 + 开始按钮 ----
  if (finished) {
    return (
      <div className="video-briefing video-end">
        <div className="video-end-card">
          <span className="video-end-kicker">{video.kicker}</span>
          <h1 className="video-end-title">{video.title}</h1>
          <p className="video-end-sub">
            {formatText(video.sceneIndicator, {
              current: scenes.length,
              total: scenes.length,
            })}
            ｜{video.startLabel}
          </p>
          <button className="video-start-btn" onClick={onStart}>
            ▶ {video.startLabel}
          </button>
          <button className="video-replay-btn" onClick={replay}>
            ↺ {video.replayLabel}
          </button>
        </div>
      </div>
    );
  }

  const scene = scenes[sceneIndex];

  return (
    <div className="video-briefing">
      {/* 场景画面：图片（Ken Burns 缓推）或纯字幕幕 */}
      <div
        className={`video-scene ${scene.image ? 'has-image' : ''}`}
        key={scene.id}
        onClick={togglePlay}
      >
        {scene.image && (
          <img className="video-scene-img" src={scene.image} alt={scene.kicker} />
        )}
        <div className="video-scene-shade" aria-hidden="true" />
        <div className="video-scene-text">
          <span className="video-scene-kicker">{scene.kicker}</span>
          <p className="video-scene-caption">{scene.caption}</p>
        </div>
        {!playing && <div className="video-paused-mark">⏸ 已暂停</div>}
      </div>

      {/* 控制条：跳过 + 进度点 + 播放/暂停 */}
      <div className="video-controls">
        <button className="video-skip-btn" onClick={skip}>
          {video.skipLabel} ≫
        </button>
        <div className="video-progress">
          {scenes.map((s, i) => (
            <span
              key={s.id}
              className={`video-progress-dot ${i < sceneIndex ? 'done' : ''} ${
                i === sceneIndex ? 'active' : ''
              }`}
            >
              {i === sceneIndex && (
                <i
                  className="video-progress-fill"
                  style={{
                    animationDuration: `${s.duration}ms`,
                    animationPlayState: playing ? 'running' : 'paused',
                  }}
                />
              )}
            </span>
          ))}
        </div>
        <button
          className="video-play-toggle"
          onClick={togglePlay}
          aria-label={playing ? '暂停' : '播放'}
        >
          {playing ? '⏸' : '▶'}
        </button>
      </div>
    </div>
  );
}
