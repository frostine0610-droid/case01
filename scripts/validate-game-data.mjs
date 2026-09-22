import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const gameData = JSON.parse(readFileSync(new URL('../gameData.json', import.meta.url), 'utf8'));
const errors = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) errors.push(message);
}

function uniqueIds(items, label) {
  const ids = items.map((item) => item?.id);
  check(ids.every((id) => typeof id === 'string' && id.length > 0), `${label}存在空 ID`);
  check(new Set(ids).size === ids.length, `${label}存在重复 ID`);
  return new Set(ids);
}

function walk(value, visit, path = 'gameData') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visit, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  visit(value, path);
  Object.entries(value).forEach(([key, child]) => walk(child, visit, `${path}.${key}`));
}

const peopleIds = uniqueIds(gameData.people, '人物');
const evidenceIds = uniqueIds(gameData.evidence, '线索');
uniqueIds(gameData.phone.apps, '手机 App');
const photoIds = uniqueIds(gameData.content.gallery.photos, '图库照片');
const chatIds = uniqueIds(gameData.content.wechat.chats, '微信会话');
const eventIds = uniqueIds(gameData.content.doorLock.events, '门锁事件');
const clueGroupIds = uniqueIds(gameData.clueGroups, '线索时间分组');

check(chatIds.size > 0, '微信会话不能为空');
check(eventIds.size > 0, '门锁记录不能为空');
check(['login', 'briefing', 'phone', 'settlement'].includes(gameData.game.startScreenId), '初始页面 ID 非法');
check(gameData.phone.apps.every((app) => !('badgeCondition' in app) && !('badgeText' in app)), '手机 App 含有废弃角标字段');
check(gameData.content.wechat.chats.every((chat) => !('badgeCondition' in chat)), '微信会话含有废弃角标字段');
check(!('modeLabel' in gameData.phone.statusBar), '状态栏含有废弃模式字段');

const timelineOrders = gameData.evidence.map((item) => item.timelineOrder);
check(new Set(timelineOrders).size === timelineOrders.length, '线索 timelineOrder 存在重复值');
gameData.evidence.forEach((item) => {
  check(Number.isFinite(item.timelineOrder) && item.timelineOrder > 0, `线索 ${item.id} 的 timelineOrder 非法`);
  check(Boolean(item.title && item.timelineTime && item.timelineDesc && item.sourceLabel), `线索 ${item.id} 缺少展示字段`);
  check(typeof item.hint === 'string' && item.hint.length >= 6, `线索 ${item.id} 缺少有效提示`);
  check(clueGroupIds.has(item.timeGroup), `线索 ${item.id} 引用了不存在的时间分组 ${item.timeGroup}`);
});

const allMessages = gameData.content.wechat.chats.flatMap((chat) => chat.messages || []);
const messageIds = uniqueIds(allMessages, '微信消息');
allMessages.forEach((message) => {
  check(peopleIds.has(message.senderId), `消息 ${message.id} 引用了不存在的人物 ${message.senderId}`);
  if (message.attachment?.photoId) {
    check(photoIds.has(message.attachment.photoId), `消息 ${message.id} 引用了不存在的照片 ${message.attachment.photoId}`);
  }
});

gameData.content.contacts.groups.forEach((group) => {
  (group.personIds || []).forEach((personId) => {
    check(peopleIds.has(personId), `联系人分组 ${group.id} 引用了不存在的人物 ${personId}`);
  });
});

gameData.content.doorLock.events.forEach((event) => {
  check(peopleIds.has(event.personId), `门锁事件 ${event.id} 引用了不存在的人物 ${event.personId}`);
});

walk(gameData, (object, path) => {
  if (Array.isArray(object.grantsEvidenceIds)) {
    object.grantsEvidenceIds.forEach((id) => {
      check(evidenceIds.has(id), `${path} 发放了不存在的线索 ${id}`);
    });
  }
  if (Array.isArray(object.messageIds)) {
    object.messageIds.forEach((id) => {
      check(messageIds.has(id), `${path} 引用了不存在的消息 ${id}`);
    });
  }
  if (object.eventId) {
    check(eventIds.has(object.eventId), `${path} 引用了不存在的门锁事件 ${object.eventId}`);
  }
});

gameData.conclusionReport.questions.forEach((question) => {
  const optionIds = uniqueIds(question.options, `问题 ${question.id} 的选项`);
  check(question.correctOptionIds.length === 1, `问题 ${question.id} 必须且只能有一个正确答案`);
  question.correctOptionIds.forEach((id) => {
    check(optionIds.has(id), `问题 ${question.id} 的正确答案 ${id} 不在选项中`);
  });
  check(Boolean(question.wrongHint), `问题 ${question.id} 缺少答错提示`);
});

const seenAssets = new Set();
walk(gameData, (object, path) => {
  for (const key of ['asset', 'thumb', 'image', 'wallpaper']) {
    const value = object[key];
    if (typeof value !== 'string' || !value.startsWith('/') || seenAssets.has(value)) continue;
    seenAssets.add(value);
    const diskPath = `${projectRoot}public${value.replaceAll('/', '\\')}`;
    check(existsSync(diskPath), `${path}.${key} 对应的素材不存在：${value}`);
  }
});

const sellerSuffix = gameData.content.marketplace.listing.seller.phoneSuffix;
check(gameData.people.some((person) => person.phoneSuffix === sellerSuffix), '卖家尾号无法与任何人物核对');
const crossTarget = gameData.content.marketplace.inspectTargets.find((target) =>
  target.type === 'sellerIdentityMatch');
check(Boolean(crossTarget), '缺少卖家身份跨来源核对目标');
check(new Set(crossTarget?.requiresSeenIds || []).size === 2, '卖家身份核对必须由两个不同来源组成');
check(crossTarget?.requiresSeenIds?.includes(crossTarget?.sellerSeenId), '卖家身份核对缺少商品页查看标识');
check(crossTarget?.requiresSeenIds?.includes(crossTarget?.contactSeenId), '卖家身份核对缺少联系人查看标识');
const itemTarget = gameData.content.marketplace.inspectTargets.find((target) =>
  target.type === 'itemMatch');
check(Boolean(itemTarget), '缺少商品特征核对目标');
check((itemTarget?.requiresEvidenceIds || []).every((id) => evidenceIds.has(id)), '商品特征核对引用了不存在的前置线索');

const rewardTiers = gameData.settlement.rewardConfig.tiers;
check(rewardTiers.length > 0, '奖励档位不能为空');
check(rewardTiers.every((tier, index) => (
  tier.maxSeconds > 0 && tier.points >= 0 && (index === 0 || tier.maxSeconds > rewardTiers[index - 1].maxSeconds)
)), '奖励档位必须按时间阈值严格递增');

const ratingConfig = gameData.settlement.ratingConfig;
check(Boolean(ratingConfig?.S && ratingConfig?.A), '缺少 S/A 评级配置');
check(ratingConfig?.S?.maxSeconds > 0, 'S 评级必须配置有效时间上限');

if (errors.length > 0) {
  console.error(`数据校验失败：${errors.length} 个问题`);
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`数据校验通过：${checks} 项检查，${seenAssets.size} 个素材引用均有效`);
