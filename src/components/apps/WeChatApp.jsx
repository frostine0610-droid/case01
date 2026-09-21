import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../game/GameContext.jsx';
import MarketApp from './MarketApp.jsx';

// 消息发送者头像底色：按人物在 people 中的序号取色
const AVATAR_COLORS = ['#4f6ef7', '#e0794b', '#8a63d2', '#3f9e6b', '#c95d8f', '#5f8fa8'];

// 文案模板替换："{count} 人" → "17 人"
function formatText(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? vars[key] : `{${key}}`
  );
}

// 微信应用：聊天列表 → 会话详情 / 304 门锁小程序
// 关键交互：查看消息上下文、附件与门锁详情后，自动记录为线索。
export default function WeChatApp() {
  const { gameData, gameState, recordObservation, viewMaterial, markSeen } = useGame();
  const { uiText } = gameData;
  const wechat = gameData.content.wechat;
  const doorLock = gameData.content.doorLock;
  const appName =
    gameData.phone.apps.find((a) => a.id === 'wechat')?.name || uiText.back;

  // 手机持有人（林夏）的消息靠右显示
  const ownerId = gameData.people.find((p) => p.name === gameData.phone.ownerName)?.id;

  const [activeChatId, setActiveChatId] = useState(null);
  // 附件查看弹层：{ chat, message }
  const [attachmentView, setAttachmentView] = useState(null);
  const [attachmentZoom, setAttachmentZoom] = useState(1);
  // 小程序下拉面板（真实微信：聊天列表顶部下拉呼出“最近使用的小程序”）
  const [miniPanelOpen, setMiniPanelOpen] = useState(false);
  // 门锁小程序：null = 未打开，'home' = 小程序首页，'records' = 开门记录页
  const [doorLockPage, setDoorLockPage] = useState(null);
  // 记录页中展开详情的事件
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [doorLockFilter, setDoorLockFilter] = useState('all');
  // 二手交易商品页（陈晨私聊中的商品链接进入）
  const [marketOpen, setMarketOpen] = useState(false);

  const activeChat = wechat.chats.find((c) => c.id === activeChatId) || null;
  const seenIds = new Set(gameState.seenContentIds);

  const personOf = (id) => gameData.people.find((p) => p.id === id);
  const colorFor = (senderId) => {
    const idx = gameData.people.findIndex((p) => p.id === senderId);
    return AVATAR_COLORS[(idx >= 0 ? idx : 0) % AVATAR_COLORS.length];
  };

  // 门锁属于微信中已有的小程序，调查开始后可随时查看。
  const doorLockHasDot = !seenIds.has(doorLock.id);
  const openDoorLock = () => {
    markSeen(doorLock.id);
    setMiniPanelOpen(false);
    setDoorLockPage('home');
    setExpandedEventId(null);
    setDoorLockFilter('all');
  };

  // 下拉手势：在聊天列表顶部向下拖动 → 呼出小程序面板；面板内向上滑 → 收起
  const miniPull = useRef(null);
  const onListPointerDown = (e) => {
    miniPull.current = { y: e.clientY };
  };
  const onListPointerUp = (e) => {
    if (!miniPull.current) return;
    const dy = e.clientY - miniPull.current.y;
    miniPull.current = null;
    if (dy > 56) setMiniPanelOpen(true);
    else if (dy < -56) setMiniPanelOpen(false);
  };

  // 聊天列表不显示未读角标（按设定保持列表简洁）

  // 单条消息的检查目标（如方立 20:14 的说法 → E04）
  const targetOfMessage = (chat, messageId) =>
    (chat.inspectTargets || []).find(
      (t) => t.messageIds.length === 1 && t.messageIds.includes(messageId)
    );
  // 多条消息组合的检查目标（E05：两条时间记录）
  const groupTargetOf = (chat) =>
    (chat.inspectTargets || []).find((t) => t.messageIds.length > 1);

  const openChat = (chatId) => {
    setActiveChatId(chatId);
    setAttachmentView(null);
  };

  // 点击附件：查看两条独立时间记录后，自动形成一条时间线笔记。
  const openAttachment = (chat, message) => {
    if (!message.attachment) return;
    if (message.attachment.type === 'record') {
      markSeen(message.id);
      const groupTarget = groupTargetOf(chat);
      if (groupTarget) {
        const viewed = new Set([...gameState.seenContentIds, message.id]);
        if (groupTarget.messageIds.every((id) => viewed.has(id))) {
          groupTarget.grantsEvidenceIds.forEach(recordObservation);
        }
      }
    }
    setAttachmentZoom(1);
    setAttachmentView({ chat, message });
  };

  // 消息列表自动滚到底部（最新消息）
  const messagesRef = useRef(null);
  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [activeChatId]);

  // ---- 附件渲染 ----
  const renderAttachment = (chat, message) => {
    const att = message.attachment;
    if (!att) return null;
    if (att.type === 'photo') {
      const photo = gameData.content.gallery.photos.find((p) => p.id === att.photoId);
      if (!photo) return null;
      return (
        <button
          className="wechat-bubble wechat-att-photo"
          onClick={() => openAttachment(chat, message)}
          title={photo.title}
        >
          <img src={photo.asset} alt={photo.title} />
        </button>
      );
    }
    if (att.type === 'record') {
      const seen = seenIds.has(message.id);
      return (
        <button
          className={`wechat-att-record ${seen ? 'seen' : ''}`}
          onClick={() => openAttachment(chat, message)}
        >
          <span className="wechat-att-record-icon">{att.icon}</span>
          <span className="wechat-att-record-info">
            <b>{att.label}</b>
            <span>{seen ? uiText.recordViewed : uiText.viewRecord}</span>
          </span>
          <span className="wechat-att-record-arrow">›</span>
        </button>
      );
    }
    if (att.type === 'productCard') {
      return (
        <button className="wechat-att-product" onClick={() => setMarketOpen(true)}>
          <span className="wechat-att-product-img">{att.icon}</span>
          <span className="wechat-att-product-info">
            <b>{att.title}</b>
            <span>{att.meta}</span>
          </span>
          <span className="wechat-att-product-link">
            {gameData.content.marketplace.entryLabel} ›
          </span>
        </button>
      );
    }
    return null;
  };

  // ---- 附件查看弹层（照片信息 / 时间记录） ----
  const renderAttachmentPopup = () => {
    if (!attachmentView) return null;
    const { message } = attachmentView;
    const att = message.attachment;
    const photo =
      att.type === 'photo'
        ? gameData.content.gallery.photos.find((p) => p.id === att.photoId)
        : null;
    const lines = att.type === 'photo' ? photo?.info || [] : att.popupLines || [];
    return (
      <div
        className="wechat-att-popup"
        onClick={(e) => {
          if (e.target === e.currentTarget) setAttachmentView(null);
        }}
      >
        <div className="wechat-att-popup-card">
          <div className="wechat-att-popup-title">{att.popupTitle}</div>
          {att.type === 'record' && <div className="wechat-att-popup-icon">{att.icon}</div>}
          {photo && (
            <>
              <div className="wechat-photo-zoom-viewport">
                <img
                  className="wechat-att-popup-img"
                  src={photo.asset}
                  alt={photo.title}
                  style={{ transform: `scale(${attachmentZoom})` }}
                  onDoubleClick={() => setAttachmentZoom((value) => (value === 1 ? 2 : 1))}
                />
              </div>
              <div className="wechat-photo-zoom-controls">
                <button onClick={() => setAttachmentZoom((value) => Math.max(1, value - 0.5))}>−</button>
                <span>{Math.round(attachmentZoom * 100)}%</span>
                <button onClick={() => setAttachmentZoom((value) => Math.min(3, value + 0.5))}>＋</button>
              </div>
            </>
          )}
          {photo && <div className="wechat-att-popup-name">{photo.title}</div>}
          {lines.map((line) => (
            <div className="wechat-att-popup-line" key={line}>
              {line}
            </div>
          ))}
          <button className="wechat-att-popup-close" onClick={() => setAttachmentView(null)}>
            {uiText.dialogConfirm}
          </button>
        </div>
      </div>
    );
  };

  // ---- 304 门锁小程序（首页 → 开门记录 → 事件详情） ----
  const renderDoorLock = () => {
    const target = doorLock.inspectTargets[0];
    const targetEvidenceId = target?.grantsEvidenceIds[0];
    const targetObserved =
      targetEvidenceId && gameState.observedMaterialIds.includes(targetEvidenceId);
    const visibleEvents = doorLock.events.filter(
      (event) => doorLockFilter === 'all' || event.action === doorLockFilter
    );
    const enterCount = doorLock.events.filter((event) => event.action === 'enter').length;
    const leaveCount = doorLock.events.filter((event) => event.action === 'leave').length;

    return (
      <div className="doorlock-app">
        <div className="doorlock-mini-header">
          <button
            className="wechat-subheader-back"
            onClick={() => {
              if (doorLockPage === 'records') setDoorLockPage('home');
              else setDoorLockPage(null);
            }}
          >
            ← {doorLockPage === 'records' ? doorLock.appName : appName}
          </button>
          <div className="wechat-subheader-info">
            <span className="wechat-subheader-title">
              {doorLockPage === 'records' ? doorLock.home.recordsEntry : doorLock.appName}
            </span>
            <span className="wechat-subheader-sub">
              {doorLockPage === 'records' ? doorLock.date : doorLock.entryName}
            </span>
          </div>
          <span className="doorlock-capsule" aria-hidden="true">•••　○</span>
        </div>

        {doorLockPage === 'home' ? (
          <div className="doorlock-home">
            <div className="doorlock-brand-row">
              <span className="doorlock-brand-icon">智</span>
              <span>
                <b>{doorLock.provider}</b>
                <small>{doorLock.home.accessMode}</small>
              </span>
            </div>
            <div className="doorlock-room-card">
              <div className="doorlock-room-top">
                <div className="doorlock-room-icon">🔒</div>
                <div>
                  <span className="doorlock-room-location">{doorLock.home.locationLabel}</span>
                  <h3>{doorLock.home.room}</h3>
                  <span className="doorlock-online"><i /> {doorLock.home.onlineStatus}</span>
                </div>
              </div>
              <div className="doorlock-status-panel">
                <div>
                  <span>{doorLock.home.lockStatusLabel}</span>
                  <b className="doorlock-locked">{doorLock.home.lockStatus}</b>
                </div>
                <div>
                  <span>{doorLock.home.lastSyncLabel}</span>
                  <b>{doorLock.home.lastSync}</b>
                </div>
              </div>
              <div className="doorlock-room-meta">
                <span>{doorLock.home.adminLabel}：{doorLock.home.admin}</span>
                <span>{doorLock.home.deviceLabel}：{doorLock.home.deviceId}</span>
              </div>
            </div>
            <div className="doorlock-home-stats">
              <div><b>{doorLock.events.length}</b><span>当晚记录</span></div>
              <div><b>{enterCount}</b><span>进入</span></div>
              <div><b>{leaveCount}</b><span>离开</span></div>
            </div>
            <button
              className="doorlock-records-entry"
              onClick={() => setDoorLockPage('records')}
            >
              📋 {doorLock.home.recordsEntry}
              <span className="doorlock-records-arrow">›</span>
            </button>
            <p className="doorlock-readonly-note">{doorLock.home.readonlyNote}</p>
          </div>
        ) : (
          <div className="doorlock-records">
            <div className="doorlock-record-toolbar">
              <div className="doorlock-date-chip">📅 {doorLock.date}</div>
              <span>{doorLock.events.length} 条记录</span>
            </div>
            <div className="doorlock-filter-row">
              {doorLock.filters.map((filter) => (
                <button
                  key={filter.id}
                  className={doorLockFilter === filter.id ? 'active' : ''}
                  onClick={() => {
                    setDoorLockFilter(filter.id);
                    setExpandedEventId(null);
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <p className="doorlock-notice">{doorLock.notice}</p>
            <div className="doorlock-event-list">
              {visibleEvents.map((event) => {
                const person = personOf(event.personId);
                const isTarget = target?.eventId === event.id;
                const expanded = expandedEventId === event.id;
                return (
                  <div
                    className={`doorlock-event ${expanded ? 'expanded' : ''}`}
                    key={event.id}
                  >
                    <button
                      className="doorlock-event-row"
                      onClick={() => {
                        setExpandedEventId(expanded ? null : event.id);
                        if (!expanded && isTarget && targetEvidenceId) {
                          recordObservation(targetEvidenceId);
                        }
                      }}
                    >
                      <span className={`doorlock-event-node ${event.action}`} aria-hidden="true" />
                      <span className="doorlock-event-time">{event.time}</span>
                      <span className="doorlock-event-person">{person?.name}</span>
                      <span
                        className={`doorlock-event-action ${event.action}`}
                      >
                        {doorLock.actionLabels[event.action]}
                      </span>
                      <span className="doorlock-event-status">{event.status}</span>
                      <span className="doorlock-event-arrow">{expanded ? '⌃' : '⌄'}</span>
                    </button>
                    {expanded && (
                      <div className="doorlock-event-detail">
                        {doorLock.detailLabels.map((label, i) => (
                          <div className="doorlock-detail-row" key={label}>
                            <span>{label}</span>
                            <b>{event.detailValues[i]}</b>
                          </div>
                        ))}
                        <div className="doorlock-record-id">记录编号：{event.id}</div>
                        {isTarget && (
                          <div className="doorlock-target-area">
                            {targetObserved ? (
                              <button
                                className="wechat-msg-chip pin"
                                onClick={() => viewMaterial(targetEvidenceId)}
                                title="查看线索"
                              >
                                已记录线索
                              </button>
                            ) : null}
                            {targetObserved && (
                              <p className="doorlock-target-result">{target.resultText}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {visibleEvents.length === 0 && (
                <div className="doorlock-empty">当前筛选条件下没有记录。</div>
              )}
            </div>
            <p className="doorlock-footer">{doorLock.footerNote}</p>
          </div>
        )}
        <nav className="doorlock-tabbar" aria-label="小程序导航">
          <button
            className={doorLockPage === 'home' ? 'active' : ''}
            onClick={() => setDoorLockPage('home')}
          >
            <span>⌂</span>首页
          </button>
          <button
            className={doorLockPage === 'records' ? 'active' : ''}
            onClick={() => setDoorLockPage('records')}
          >
            <span>≡</span>记录
          </button>
        </nav>
      </div>
    );
  };

  // ---- 会话详情 ----
  const renderDetail = (chat) => {
    // 两条时间记录都查看后，相关材料会自动写入笔记。
    const groupTarget = groupTargetOf(chat);
    const groupObserved =
      groupTarget &&
      groupTarget.grantsEvidenceIds.every((id) => gameState.observedMaterialIds.includes(id));
    const groupRecordsSeen =
      groupTarget && groupTarget.messageIds.every((id) => seenIds.has(id));

    return (
      <div className="wechat-detail">
        <div className="wechat-subheader">
          <button className="wechat-subheader-back" onClick={() => setActiveChatId(null)}>
            ← {appName}
          </button>
          <div className="wechat-subheader-info">
            <span className="wechat-subheader-title">{chat.title}</span>
            {chat.kind === 'group' && (
              <span className="wechat-subheader-sub">
                {formatText(uiText.chatMembersFormat, { count: chat.memberCount })}
              </span>
            )}
          </div>
        </div>

        <div className="wechat-messages" ref={messagesRef}>
          {chat.dateLabel && <div className="wechat-date-divider">{chat.dateLabel}</div>}
          {chat.messages.map((message, idx) => {
            const prev = chat.messages[idx - 1];
            const showTime = !prev || prev.time !== message.time;
            const person = personOf(message.senderId);
            const self = message.senderId === ownerId;
            const target = targetOfMessage(chat, message.id);
            const targetEvidenceId = target?.grantsEvidenceIds[0];
            const targetObserved =
              targetEvidenceId && gameState.observedMaterialIds.includes(targetEvidenceId);

            return (
              <div key={message.id}>
                {showTime && <div className="wechat-time-chip">{message.time}</div>}
                <div className={`wechat-msg ${self ? 'self' : ''}`}>
                  <span
                    className="wechat-msg-avatar"
                    style={{ background: colorFor(message.senderId) }}
                  >
                    {person?.name.slice(0, 1) || '?'}
                  </span>
                  <span className="wechat-msg-body">
                    {!self && chat.kind === 'group' && (
                      <span className="wechat-msg-sender">{person?.name}</span>
                    )}
                    {message.text && <span className="wechat-bubble">{message.text}</span>}
                    {renderAttachment(chat, message)}
                  </span>
                  {target && targetObserved && (
                    <button
                      className="wechat-msg-chip pin"
                      onClick={() => viewMaterial(targetEvidenceId)}
                      title="查看线索"
                    >
                      已核对
                    </button>
                  )}
                  {target && !targetObserved && (
                    <button
                      className="wechat-msg-chip"
                      onClick={() => recordObservation(targetEvidenceId)}
                      title={target.label}
                    >
                      查看消息详情
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {groupTarget && groupRecordsSeen && groupObserved && (
          <div className="wechat-markbar done">
            <span className="wechat-markbar-result">已记录线索：{groupTarget.resultText}</span>
          </div>
        )}
      </div>
    );
  };

  // ---- 聊天列表（真实微信：顶部下拉呼出“最近使用的小程序”面板） ----
  return (
    <div className="wechat-app">
      {marketOpen ? (
        <MarketApp onClose={() => setMarketOpen(false)} />
      ) : doorLockPage ? (
        renderDoorLock()
      ) : activeChat ? (
        renderDetail(activeChat)
      ) : (
        <div
          className="wechat-chat-list"
          onPointerDown={onListPointerDown}
          onPointerUp={onListPointerUp}
        >
          {/* 下拉提示条：点击也可呼出小程序面板 */}
          <button
            className="wechat-pull-hint"
            onClick={() => setMiniPanelOpen(true)}
            title={uiText.miniprogramPullHint}
          >
            <span className="wechat-pull-hint-arrow" aria-hidden="true">⌃</span>
            <span>{uiText.miniprogramPullHint}</span>
          </button>
          {wechat.chats.map((chat) => (
            <button key={chat.id} className="wechat-chat-item" onClick={() => openChat(chat.id)}>
              <span className="wechat-avatar">{chat.avatar || chat.title.slice(0, 1)}</span>
              <span className="wechat-chat-main">
                <span className="wechat-chat-top">
                  <span className="wechat-chat-title">{chat.title}</span>
                  <span className="wechat-chat-time">{chat.lastTime}</span>
                </span>
                <span className="wechat-chat-preview">{chat.preview}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {/* 小程序下拉面板：半透明毛玻璃浮层，点击遮罩收起 */}
      {miniPanelOpen && !activeChat && !doorLockPage && !marketOpen && (
        <div
          className="wechat-mini-panel"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMiniPanelOpen(false);
          }}
          onPointerDown={onListPointerDown}
          onPointerUp={onListPointerUp}
        >
          <div className="wechat-mini-panel-body">
            <div className="wechat-mini-panel-head">
              <span className="wechat-mini-panel-title">
                {uiText.miniprogramRecentLabel}
              </span>
              <button
                className="wechat-mini-panel-collapse"
                onClick={() => setMiniPanelOpen(false)}
              >
                ⌄ {uiText.miniprogramCollapse}
              </button>
            </div>
            <div className="wechat-mini-panel-grid">
              <button className="wechat-mini-app" onClick={openDoorLock}>
                <span className="wechat-mini-app-icon">
                  {doorLock.entryIcon}
                  {doorLockHasDot && <span className="wechat-unread-dot" />}
                </span>
                <span className="wechat-mini-app-name">{doorLock.entryName}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {renderAttachmentPopup()}
    </div>
  );
}
