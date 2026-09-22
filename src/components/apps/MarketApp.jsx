import { useState } from 'react';
import { useGame } from '../../game/GameContext.jsx';

function formatText(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? vars[key] : `{${key}}`
  );
}

// 二手交易 App（闲置交易）：由陈晨私聊中的商品链接进入
// 关键交互：
// 完成商品特征对比，以及卖家联系尾号与另一处相同尾号的交叉核对后，结果自动记录为线索。
export default function MarketApp({ onClose }) {
  const { gameData, gameState, recordObservation, viewMaterial, markSeen, markRead } = useGame();
  const { uiText } = gameData;
  const market = gameData.content.marketplace;
  const listing = market.listing;

  // 正在查看的商品图（大图弹层）
  const [viewingImageId, setViewingImageId] = useState(null);
  // 商品特征对比视图
  const [compareOpen, setCompareOpen] = useState(false);

  const observed = (id) => gameState.observedMaterialIds.includes(id);

  const itemTarget = market.inspectTargets.find((target) => target.type === 'itemMatch');
  const sellerTarget = market.inspectTargets.find(
    (target) => target.type === 'sellerIdentityMatch'
  );
  const itemEvidenceId = itemTarget?.grantsEvidenceIds?.[0];
  const sellerEvidenceId = sellerTarget?.grantsEvidenceIds?.[0];
  const itemPrerequisitesMet = (itemTarget?.requiresEvidenceIds || []).every(observed);
  const itemObserved = Boolean(itemEvidenceId && observed(itemEvidenceId));
  const sellerObserved = Boolean(sellerEvidenceId && observed(sellerEvidenceId));

  // 卖家联系电话是否已点击查看（跨来源核对的一半条件）
  const sellerPhoneSeen = Boolean(
    sellerTarget?.sellerSeenId && gameState.seenContentIds.includes(sellerTarget.sellerSeenId)
  );
  // 通讯录中尾号一致的联系人（方立）
  const matchedPerson = gameData.people.find(
    (p) => p.phoneSuffix === listing.seller.phoneSuffix
  );

  const viewingImage = listing.images.find((img) => img.id === viewingImageId) || null;
  // 对比基准照片：器材登记照（图库 PHOTO-A）
  const regPhoto = gameData.content.gallery.photos.find((p) => p.id === 'PHOTO-A');
  const openImage = (imageId) => {
    markRead(`market:${imageId}`);
    setViewingImageId(imageId);
  };

  return (
    <div className="market-app">
      <div className="wechat-subheader">
        <button className="wechat-subheader-back" onClick={onClose}>
          ← {gameData.phone.apps.find((a) => a.id === 'wechat')?.name || uiText.back}
        </button>
        <div className="wechat-subheader-info">
          <span className="wechat-subheader-title">{market.appName}</span>
          <span className="wechat-subheader-sub">{listing.postedAtLabel}</span>
        </div>
      </div>

      <div className="market-body">
        {/* 商品图片：主图 + 缩略图 */}
        <button
          className="market-main-image"
          onClick={() => openImage(listing.images[0].id)}
          title={listing.images[0].caption}
        >
          <img src={listing.images[0].asset} alt={listing.images[0].caption} />
          <span className="market-image-count">{listing.images.length} 张</span>
        </button>
        <div className="market-thumbs">
          {listing.images.map((img) => (
            <button
              key={img.id}
              className="market-thumb"
              onClick={() => openImage(img.id)}
              title={img.caption}
            >
              <img src={img.asset} alt={img.caption} loading="lazy" />
            </button>
          ))}
        </div>

        {/* 商品信息 */}
        <div className="market-info">
          <div className="market-title-row">
            <span className="market-price">{listing.price}</span>
            {itemObserved && (
              <button
                className="wechat-msg-chip pin"
                onClick={() => viewMaterial(itemEvidenceId)}
                title="查看线索"
              >
                已记录
              </button>
            )}
          </div>
          <div className="market-title">{listing.title}</div>
          <div className="market-meta">
            {listing.postedAtLabel}｜{listing.distance}｜{listing.delivery}
          </div>
          <p className="market-desc">{listing.description}</p>
        </div>

        {/* 卖家信息 */}
        <div className="market-seller">
          <div className="market-seller-head">
            <span className="market-seller-avatar">
              {listing.seller.nickname.slice(0, 1)}
            </span>
            <span className="market-seller-info">
              <b>{listing.seller.nickname}</b>
              <span>{listing.seller.registeredLabel}</span>
              <span>{listing.seller.listingsCount}</span>
            </span>
            {sellerObserved && (
              <button
                className="wechat-msg-chip pin"
                onClick={() => viewMaterial(sellerEvidenceId)}
                title="查看线索"
              >
                已记录
              </button>
            )}
          </div>
          {/* 卖家联系电话：点击查看，并与通讯录中的同尾号联系人核对 */}
          {!sellerObserved ? (
            <button
              className={`market-seller-phone ${sellerPhoneSeen ? 'seen' : ''}`}
              onClick={() => sellerTarget?.sellerSeenId && markSeen(sellerTarget.sellerSeenId)}
            >
              <span className="market-seller-phone-number">
                {formatText(uiText.sellerPhoneFormat, { suffix: listing.seller.phoneSuffix })}
              </span>
              <span className="market-seller-phone-action">
                {sellerPhoneSeen
                  ? uiText.sellerPhoneViewedLabel
                  : uiText.sellerPhoneCheckLabel}
              </span>
            </button>
          ) : (
            <div className="market-contact-result">
              <div className="market-profile-compare">
                <div>
                  <span>商品卖家尾号</span>
                  <b>**** {listing.seller.phoneSuffix}</b>
                </div>
                <span className="market-profile-equals">=</span>
                <div>
                  <span>方立的通讯录尾号</span>
                  <b>**** {matchedPerson?.phoneSuffix}</b>
                </div>
              </div>
              <p className="market-target-result">{sellerTarget.resultText}</p>
            </div>
          )}
          {sellerPhoneSeen && !sellerObserved && (
            <div className="cross-check-status partial">
              <b>{uiText.crossCheckHalfLabel}</b>
              <span>{uiText.crossCheckHalfHint}</span>
            </div>
          )}
        </div>
      </div>

      {/* 商品图片查看弹层（含登记照对比入口） */}
      {viewingImage && (
        <div
          className="wechat-att-popup"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setViewingImageId(null);
              setCompareOpen(false);
            }
          }}
        >
          <div className="wechat-att-popup-card">
            <div className="wechat-att-popup-title">{viewingImage.caption}</div>
            <img
              className="wechat-att-popup-img"
              src={viewingImage.asset}
              alt={viewingImage.caption}
            />

            {/* 商品特征对比：前置线索由目标配置决定 */}
            {viewingImage.compareFeature ? (
              compareOpen ? (
                <div className="market-compare">
                  <div className="market-compare-title">
                    {uiText.marketCompareTitle}
                  </div>
                  <div className="market-compare-panels">
                    <div className="market-compare-panel">
                      <img src={regPhoto.asset} alt={regPhoto.title} />
                      <span>{uiText.marketCompareRegLabel}</span>
                    </div>
                    <div className="market-compare-panel">
                      <img src={viewingImage.asset} alt={viewingImage.caption} />
                      <span>{uiText.marketCompareMktLabel}</span>
                    </div>
                  </div>
                  <div className="market-compare-feature">
                    ⚠ {viewingImage.compareFeature}
                  </div>
                  {itemObserved ? (
                    <button
                      className="wechat-msg-chip pin"
                      onClick={() => viewMaterial(itemEvidenceId)}
                    >
                      已记录线索
                    </button>
                  ) : null}
                  {itemObserved && (
                    <p className="market-target-result">{itemTarget.resultText}</p>
                  )}
                </div>
              ) : itemPrerequisitesMet ? (
                <button
                  className="market-compare-btn"
                  onClick={() => {
                    setCompareOpen(true);
                    if (itemEvidenceId) recordObservation(itemEvidenceId);
                  }}
                >
                  {uiText.marketCompareBtn}
                </button>
              ) : (
                <p className="market-need-hint">{uiText.marketNeedPrerequisiteHint}</p>
              )
            ) : null}

            <button
              className="wechat-att-popup-close"
              onClick={() => {
                setViewingImageId(null);
                setCompareOpen(false);
              }}
            >
              {uiText.dialogConfirm}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
