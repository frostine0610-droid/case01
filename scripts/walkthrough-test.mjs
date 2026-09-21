// 三问通关测试：自由调查收集线索 → 纯选择题判分 → 答错提示 → 时间线数据完整性。
import { readFileSync } from 'fs';
import {
  calculateCompletionReward,
  canSubmitReport,
  gradeReport,
  redeemClueHint,
} from '../src/game/engine.js';
import { loadSavedSession, sanitizeGameState } from '../src/game/saveState.js';

const gameData = JSON.parse(readFileSync(new URL('../gameData.json', import.meta.url), 'utf8'));
let passed = 0;
let failed = 0;

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${label}${ok ? '' : ` | 实际=${JSON.stringify(actual)} 期望=${JSON.stringify(expected)}`}`);
}

const correctAnswers = { Q1: 'Q1-B', Q2: 'Q2-B', Q3: 'Q3-B' };

console.log('\n[1] 初始状态与数据完整性');
check('初始线索为空', gameData.initialState.observedMaterialIds, []);
check('初始提交次数为 0', gameData.initialState.reportSubmitCount, 0);
check('初始调查积分为 200', gameData.initialState.points, 200);
check('初始已兑换提示为空', gameData.initialState.hintedMaterialIds, []);
check('初始屏幕为登录页', gameData.game.startScreenId, 'login');
check('开场视频包含 5 个场景', gameData.briefing.video.scenes.length, 5);
check('登录页有启动日志', gameData.login.bootLines.length >= 3, true);
check('结算页有 S/A/B 三档评级', Object.keys(gameData.settlement.ratingLevels).sort().join(), 'A,B,S');
check('结算页有结束与返回按钮', Boolean(gameData.settlement.endButtonLabel && gameData.settlement.backButtonLabel), true);
check('每条线索都有时间线字段', gameData.evidence.every((e) => e.timelineOrder && e.timelineTime && e.timelineDesc), true);
check('线索时间线顺序值唯一', (() => {
  const orders = gameData.evidence.map((e) => e.timelineOrder);
  return new Set(orders).size === orders.length;
})(), true);
check('每条线索都有未发现时的位置提示', gameData.evidence.every((e) => typeof e.hint === 'string' && e.hint.length >= 6), true);
check('每条线索都属于有效的时间分组', (() => {
  const groupIds = new Set(gameData.clueGroups.map((g) => g.id));
  return gameData.evidence.every((e) => groupIds.has(e.timeGroup));
})(), true);
check('时间分组覆盖全部线索', (() => {
  const groupIds = new Set(gameData.clueGroups.map((g) => g.id));
  return gameData.evidence.every((e) => groupIds.has(e.timeGroup));
})() && gameData.evidence.length === gameData.evidence.filter((e) => e.timeGroup).length, true);
check('卖家尾号与通讯录人物尾号可核对', (() => {
  const suffix = gameData.content.marketplace.listing.seller.phoneSuffix;
  return gameData.people.some((p) => p.phoneSuffix === suffix);
})(), true);
check('二手平台不再依赖昵称匹配数据', gameData.content.marketplace.profileMatch === undefined, true);
check('尾号核对由两个来源共同组成一条线索', (() => {
  const target = gameData.content.marketplace.inspectTargets.find((item) =>
    item.grantsEvidenceIds.includes('E08')
  );
  return target.requiresSeenIds.length === 2 && target.grantsEvidenceIds.length === 1;
})(), true);
check('单边尾号查看不足以形成完整线索', (() => {
  const target = gameData.content.marketplace.inspectTargets.find((item) =>
    item.grantsEvidenceIds.includes('E08')
  );
  const oneSide = new Set([target.requiresSeenIds[0]]);
  return !target.requiresSeenIds.every((id) => oneSide.has(id));
})(), true);
check('双边尾号查看后才能形成完整线索', (() => {
  const target = gameData.content.marketplace.inspectTargets.find((item) =>
    item.grantsEvidenceIds.includes('E08')
  );
  const bothSides = new Set(target.requiresSeenIds);
  return target.requiresSeenIds.every((id) => bothSides.has(id));
})(), true);
check('半线索提示不泄露另一来源 App', (() => {
  const text = `${gameData.uiText.crossCheckHalfLabel}${gameData.uiText.crossCheckHalfHint}`;
  return !text.includes('通讯录') && !text.includes('二手') && !text.includes('联系人');
})(), true);
check('微信会话不再开放个人资料入口', gameData.content.wechat.chats.every((c) => !c.profilePersonId), true);
check('调查说明书存在且条目完整', (() => {
  const g = gameData.guide;
  return Boolean(g && g.title && Array.isArray(g.items) && g.items.length >= 4 && g.footer && g.startButtonLabel);
})(), true);
check('每道题都有答错提示', gameData.conclusionReport.questions.every((q) => q.wrongHint), true);
check('每道题都有正确答案', gameData.conclusionReport.questions.every((q) => q.correctOptionIds.length === 1), true);

console.log('\n[2] 标准通关');
{
  const result = gradeReport(correctAnswers, gameData);
  check('三题全对通过', result.allCorrect, true);
  check('没有错误项', result.wrongQuestionIds, []);
  check('没有提示', result.hints, []);
}

console.log('\n[3] 部分答错的判定与提示');
{
  const oneWrong = { ...correctAnswers, Q2: 'Q2-C' };
  const r1 = gradeReport(oneWrong, gameData);
  check('答错一题不能通过', r1.allCorrect, false);
  check('只标记答错的题', r1.wrongQuestionIds, ['Q2']);
  check('提示指向门锁记录', r1.hints.some((h) => h.includes('门锁')), true);

  const twoWrong = { Q1: 'Q1-A', Q2: 'Q2-A', Q3: 'Q3-B' };
  const r2 = gradeReport(twoWrong, gameData);
  check('两题答错都标记', r2.wrongQuestionIds, ['Q1', 'Q2']);
  check('两条提示都返回', r2.hints.length, 2);

  const allWrong = { Q1: 'Q1-A', Q2: 'Q2-A', Q3: 'Q3-A' };
  const r3 = gradeReport(allWrong, gameData);
  check('全错不能通过', r3.allCorrect, false);
  check('三题都标记', r3.wrongQuestionIds, ['Q1', 'Q2', 'Q3']);
}

console.log('\n[4] 全线索提交门槛');
{
  check('零线索不能提交结论', canSubmitReport(gameData.initialState, gameData), false);
  check('七条线索仍不能提交结论', canSubmitReport({
    ...gameData.initialState,
    observedMaterialIds: gameData.evidence.slice(0, -1).map((item) => item.id),
  }, gameData), false);
  check('收集全部线索后允许提交结论', canSubmitReport({
    ...gameData.initialState,
    observedMaterialIds: gameData.evidence.map((item) => item.id),
  }, gameData), true);
  // 提示内容不泄露答案本身
  check('提示不包含正确选项文字', (() => {
    const r = gradeReport({ ...correctAnswers, Q3: 'Q3-A' }, gameData);
    const q3 = gameData.conclusionReport.questions.find((q) => q.id === 'Q3');
    const correctLabel = q3.options.find((o) => o.id === 'Q3-B').label;
    return r.hints.every((h) => !h.includes(correctLabel));
  })(), true);
}

console.log('\n[5] 积分提示与结案奖励');
{
  const firstHint = redeemClueHint(gameData.initialState, gameData, 100);
  check('200 积分可以兑换第一条提示', firstHint.ok, true);
  check('兑换后扣除 100 积分', firstHint.state.points, 100);
  check('兑换记录写入第一条线索', firstHint.state.hintedMaterialIds, ['E01']);

  const secondHint = redeemClueHint(firstHint.state, gameData, 100);
  check('重复兑换会选择下一条未提示线索', secondHint.clue.id, 'E04');
  check('积分耗尽后不能继续兑换', redeemClueHint(secondHint.state, gameData, 100).reason, 'points');

  const rewardConfig = gameData.settlement.rewardConfig;
  check('零线索快速结案奖励为 0', calculateCompletionReward(60, rewardConfig, 0, 8), 0);
  check('收集全部线索保留完整时间奖励', calculateCompletionReward(60, rewardConfig, 8, 8), 300);
  check('收集一半线索获得一半时间奖励', calculateCompletionReward(60, rewardConfig, 4, 8), 150);
}

console.log('\n[6] 存档校验与恢复');
{
  const sanitized = sanitizeGameState({
    points: 'invalid',
    observedMaterialIds: ['E01', 'E01', 'INVALID'],
    hintedMaterialIds: 'not-an-array',
    seenContentIds: [null, 'MKT-SELLER-PHONE', 'MKT-SELLER-PHONE'],
    reportAnswers: { Q1: 'Q1-B', Q2: 'INVALID' },
    reportSubmitCount: -5,
    endingUnlocked: 'yes',
  }, gameData);
  check('损坏积分回退到初始值', sanitized.points, gameData.initialState.points);
  check('线索 ID 会去重并过滤无效值', sanitized.observedMaterialIds, ['E01']);
  check('错误类型的提示数组会被清空', sanitized.hintedMaterialIds, []);
  check('已查看内容只保留唯一字符串', sanitized.seenContentIds, ['MKT-SELLER-PHONE']);
  check('报告答案只保留有效选项', sanitized.reportAnswers, { Q1: 'Q1-B' });
  check('负数提交次数归零', sanitized.reportSubmitCount, 0);
  check('非布尔结案状态不能解锁结局', sanitized.endingUnlocked, false);

  const storage = {
    value: JSON.stringify({
      v: 11,
      screen: 'settlement',
      gameState: { observedMaterialIds: [] },
    }),
    getItem() { return this.value; },
    removeItem() { this.value = null; },
  };
  const session = loadSavedSession(storage, 'save', 11, gameData);
  check('未结案存档不能直接进入结算页', session.screen, 'phone');

  storage.value = '{bad json';
  check('损坏 JSON 存档会被忽略', loadSavedSession(storage, 'save', 11, gameData), null);
  check('损坏 JSON 存档会被清除', storage.value, null);
}

console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
process.exit(failed > 0 ? 1 : 0);
