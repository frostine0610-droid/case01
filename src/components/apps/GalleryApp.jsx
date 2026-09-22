import { useMemo, useRef, useState } from 'react';
import { useGame } from '../../game/GameContext.jsx';

function photoTimestamp(value) {
  const match = String(value).match(/(?:(\d+) 月 (\d+) 日)?\s*(\d{2}):(\d{2})/);
  if (!match) return 0;
  const month = Number(match[1] || 1);
  const day = Number(match[2] || 1);
  return new Date(2026, month - 1, day, Number(match[3]), Number(match[4])).getTime();
}

// 图库应用：全部照片按时间倒序排列 → 照片详情（左右翻页 + 缩放 + “i”信息页 + 检查目标）
export default function GalleryApp() {
  const { gameData, gameState, recordObservation, viewMaterial, markRead } = useGame();
  const gallery = gameData.content.gallery;
  const appName =
    gameData.phone.apps.find((a) => a.id === 'gallery')?.name || gameData.uiText.back;
  const [activeId, setActiveId] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  // 已展开的检查目标（写入笔记后始终展开）
  const [revealedIds, setRevealedIds] = useState([]);

  const sortedPhotos = useMemo(
    () => [...gallery.photos].sort((a, b) => photoTimestamp(b.capturedAt) - photoTimestamp(a.capturedAt)),
    [gallery.photos]
  );
  const active = gallery.photos.find((p) => p.id === activeId);
  const activeIndex = active ? sortedPhotos.findIndex((p) => p.id === active.id) : -1;
  const evidenceIdOf = (photo) => photo.inspectTargets?.[0]?.grantsEvidenceIds?.[0];

  const openPhoto = (photoId) => {
    setActiveId(photoId);
    setInfoOpen(false);
    setZoom(1);
    markRead(`gallery:${photoId}`);
  };

  // 左右翻页：切换照片时重置缩放与信息页
  const goToPhoto = (index) => {
    const next = sortedPhotos[index];
    if (!next) return;
    openPhoto(next.id);
  };

  // 详情页滑动手势：左右滑动切换上一张 / 下一张
  const swipe = useRef(null);
  const onDetailPointerDown = (e) => {
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onDetailPointerUp = (e) => {
    if (!swipe.current) return;
    const dx = e.clientX - swipe.current.x;
    const dy = e.clientY - swipe.current.y;
    swipe.current = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) goToPhoto(activeIndex + 1);
      else goToPhoto(activeIndex - 1);
    }
  };

  // ---- 照片详情视图 ----
  if (active) {
    const evidenceId = evidenceIdOf(active);
    const observed = evidenceId && gameState.observedMaterialIds.includes(evidenceId);
    const hasPrev = activeIndex > 0;
    const hasNext = activeIndex < sortedPhotos.length - 1;

    return (
      <div className="gallery-detail">
        <div className="gallery-detail-bar">
          <button
            className="gallery-back"
            onClick={() => {
              setActiveId(null);
              setInfoOpen(false);
              setZoom(1);
              setRevealedIds([]);
            }}
          >
            ← {appName}
          </button>
          <span className="photo-index">
            {activeIndex + 1} / {sortedPhotos.length}
          </span>
          <button
            className={`gallery-info-btn ${infoOpen ? 'active' : ''}`}
            onClick={() => setInfoOpen((v) => !v)}
            aria-label="照片信息"
            title="照片信息"
          >
            i
          </button>
        </div>

        <div
          className="photo-view"
          onPointerDown={onDetailPointerDown}
          onPointerUp={onDetailPointerUp}
        >
          <div className="photo-frame-box">
            {/* 左右翻页按钮：不用返回网格即可切换照片 */}
            <button
              className="photo-nav-btn photo-nav-prev"
              onClick={() => goToPhoto(activeIndex - 1)}
              disabled={!hasPrev}
              aria-label="上一张"
              title="上一张"
            >
              ‹
            </button>
            <button
              className="photo-nav-btn photo-nav-next"
              onClick={() => goToPhoto(activeIndex + 1)}
              disabled={!hasNext}
              aria-label="下一张"
              title="下一张"
            >
              ›
            </button>
            <div className="photo-zoom-viewport">
              <img
                className="photo-img"
                src={active.asset}
                alt={active.title}
                style={{ transform: `scale(${zoom})` }}
                onDoubleClick={() => setZoom((value) => (value === 1 ? 2 : 1))}
              />
            </div>
            <span className="photo-time-chip">{active.capturedAt}</span>
            <div className="photo-zoom-controls" aria-label="照片缩放">
              <button onClick={() => setZoom((value) => Math.max(1, value - 0.5))}>−</button>
              <span>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((value) => Math.min(3, value + 0.5))}>＋</button>
            </div>
          </div>
          <div className="photo-title-row">
            <span className="photo-title">{active.title}</span>
          </div>
          <div className="photo-caption">{active.caption}</div>

          {/* 同步自微信的说明（照片 B） */}
          {active.syncedChatText && (
            <div className="photo-sync-note">
              <span className="photo-sync-icon">💬</span>
              {active.syncedChatText}
            </div>
          )}

          {/* 检查目标：查看关键细节后自动记录为线索 */}
          {active.inspectTargets?.length > 0 && (
            <div className="inspect-list">
              {active.inspectTargets.map((target) => {
                const revealed =
                  revealedIds.includes(target.id) || Boolean(observed);
                return revealed ? (
                  <div className="inspect-result" key={target.id}>
                    <p className="inspect-result-text">{target.resultText}</p>
                    {observed && (
                      <div className="inspect-evidence-row">
                        <button className="inspect-evidence-chip" onClick={() => viewMaterial(evidenceId)}>
                          已记录线索 · 查看
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    className="inspect-btn"
                    key={target.id}
                    onClick={() => {
                      setRevealedIds((ids) => [...ids, target.id]);
                      target.grantsEvidenceIds?.forEach(recordObservation);
                    }}
                  >
                    🔍 {target.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* “i”信息页：拍摄时间 / 设备 / 来源 */}
        {infoOpen && (
          <div className="photo-info-sheet">
            {active.info?.map((line) => (
              <div className="photo-info-line" key={line}>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- 相册网格视图：不按“活动/生活”分类，只按拍摄时间倒序 ----
  return (
    <div className="gallery-album">
      <div className="gallery-album-head">
        <div className="gallery-album-title">{gallery.albumTitle}</div>
        <div className="gallery-album-count">
          {gallery.photos.length} {gallery.photoCountLabel}
        </div>
      </div>
      <div className="gallery-grid">
        {sortedPhotos.map((photo) => {
          const evidenceId = evidenceIdOf(photo);
          const observed = evidenceId && gameState.observedMaterialIds.includes(evidenceId);
          return (
            <button
              className="gallery-thumb"
              key={photo.id}
              onClick={() => openPhoto(photo.id)}
              title={`${photo.capturedAt} · ${photo.title}`}
            >
              <img
                className="gallery-thumb-img"
                src={photo.thumb || photo.asset}
                alt={photo.title}
                loading="lazy"
              />
              <span className="gallery-thumb-time">{photo.capturedAt}</span>
              {observed && <span className="gallery-thumb-pin">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
