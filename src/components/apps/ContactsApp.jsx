import { useState } from 'react';
import { useGame } from '../../game/GameContext.jsx';

function formatText(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? vars[key] : `{${key}}`
  );
}

// 通讯录应用：分组联系人列表 + 搜索（姓名/尾号）+ 联系人详情。
// 查看与二手卖家尾号一致的联系人详情时，记为卖家身份核对的一半条件。
export default function ContactsApp() {
  const { gameData, gameState, markSeen, viewMaterial, markRead } = useGame();
  const { uiText } = gameData;
  const contacts = gameData.content.contacts;
  // 二手平台卖家的联系尾号（用于跨应用核对）
  const sellerSuffix = gameData.content.marketplace?.listing?.seller?.phoneSuffix;
  const sellerTarget = gameData.content.marketplace?.inspectTargets?.find(
    (target) => target.type === 'sellerIdentityMatch'
  );
  const sellerEvidenceId = sellerTarget?.grantsEvidenceIds?.[0];
  const [keyword, setKeyword] = useState('');
  const [activeEntry, setActiveEntry] = useState(null); // { name, phone, role }
  const sellerMatchObserved = Boolean(
    sellerEvidenceId && gameState.observedMaterialIds.includes(sellerEvidenceId)
  );

  // 展开分组：personIds 引用 people，entries 为普通联系人
  const groups = contacts.groups.map((group) => {
    const items = [
      ...group.personIds.map((pid) => {
        const p = gameData.people.find((x) => x.id === pid);
        return p
          ? { id: p.id, name: p.name, phoneSuffix: p.phoneSuffix, role: p.role }
          : null;
      }),
      ...(group.entries || []),
    ].filter(Boolean);
    return { ...group, items };
  });

  const kw = keyword.trim();
  const filtered = kw
    ? groups
        .map((g) => ({
          ...g,
          items: g.items.filter(
            (it) => it.name.includes(kw) || (it.phoneSuffix || '').includes(kw)
          ),
        }))
        .filter((g) => g.items.length > 0)
    : groups;

  // ---- 联系人详情 ----
  if (activeEntry) {
    return (
      <div className="contacts-detail">
        <div className="gallery-detail-bar">
          <button
            className="gallery-back"
            onClick={() => setActiveEntry(null)}
          >
            ← {gameData.phone.apps.find((a) => a.id === 'contacts')?.name || uiText.back}
          </button>
        </div>
        <div className="contacts-card">
          <div className="contacts-avatar">{activeEntry.name.slice(0, 1)}</div>
          <div className="contacts-name">{activeEntry.name}</div>
          <div className="contacts-phone">
            {formatText(uiText.contactsPhoneFormat, { suffix: activeEntry.phoneSuffix })}
          </div>
          {activeEntry.role && (
            <div className="contacts-role">
              <span className="contacts-role-label">{uiText.contactsRoleLabel}</span>
              {activeEntry.role}
            </div>
          )}
          {activeEntry.phoneSuffix === sellerSuffix && (
            sellerMatchObserved ? (
              <button
                className="cross-check-status complete"
                onClick={() => viewMaterial(sellerEvidenceId)}
              >
                <b>{uiText.crossCheckCompleteLabel}</b>
                <span>点击查看已形成的核对线索</span>
              </button>
            ) : (
              <div className="cross-check-status partial">
                <b>{uiText.crossCheckHalfLabel}</b>
                <span>{uiText.crossCheckHalfHint}</span>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  // ---- 分组列表 ----
  return (
    <div className="contacts-list">
      <input
        className="contacts-search"
        type="text"
        value={keyword}
        placeholder={uiText.contactsSearchPlaceholder}
        onChange={(e) => setKeyword(e.target.value)}
      />
      {filtered.length === 0 && (
        <p className="contacts-empty">{uiText.contactsNoResult}</p>
      )}
      {filtered.map((group) => (
        <div className="contacts-group" key={group.id}>
          <div className="contacts-group-label">{group.label}</div>
          {group.items.map((it) => (
            <button
              className="contacts-row"
              key={it.id}
              onClick={() => {
                setActiveEntry(it);
                markRead(`contacts:${it.id}`);
                // 打开与卖家尾号一致的联系人详情 → 满足核对条件的另一半
                if (
                  it.phoneSuffix &&
                  it.phoneSuffix === sellerSuffix &&
                  sellerTarget?.contactSeenId
                ) {
                  markSeen(sellerTarget.contactSeenId);
                }
              }}
            >
              <span className="contacts-row-avatar">{it.name.slice(0, 1)}</span>
              <span className="contacts-row-info">
                <b>{it.name}</b>
                <span>
                  {formatText(uiText.contactsPhoneFormat, { suffix: it.phoneSuffix })}
                </span>
              </span>
              <span className="contacts-row-arrow">›</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
