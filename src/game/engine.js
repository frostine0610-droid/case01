// 纯函数游戏引擎：最终报告判定。
// 玩家可以自由调查；通关只检查“结论是否正确”，答错返回该问题的指向性提示。

export function gradeReport(answers, gameData) {
  const wrongIds = [];
  const hints = [];
  const report = gameData.conclusionReport;

  for (const question of report.questions) {
    const selected = answers[question.id];
    const correct = selected === question.correctOptionIds[0];
    if (!correct) {
      wrongIds.push(question.id);
      hints.push(question.wrongHint || `${question.shortTitle}：结论与现有事实不符。`);
    }
  }

  return { allCorrect: wrongIds.length === 0, wrongQuestionIds: wrongIds, hints };
}

// 统一的线索进度口径：仅统计案件数据中存在的证据 ID，并自动去重。
export function getEvidenceProgress(state, gameData) {
  const evidence = Array.isArray(gameData?.evidence) ? gameData.evidence : [];
  const observedIds = Array.isArray(state?.observedMaterialIds)
    ? state.observedMaterialIds
    : [];
  const observed = new Set(observedIds);
  const found = evidence.reduce(
    (count, item) => count + (observed.has(item.id) ? 1 : 0),
    0
  );
  const total = evidence.length;
  const missing = Math.max(0, total - found);

  return {
    found,
    total,
    missing,
    complete: missing === 0,
    percent: total === 0 ? 0 : Math.min(100, Math.max(0, (found / total) * 100)),
  };
}

export function canSubmitReport(state, gameData) {
  return getEvidenceProgress(state, gameData).complete;
}

// 浏览记录与案件线索完全分离：它只统计玩家主动打开过的信息项，包含干扰信息。
function getBrowseGroups(gameData) {
  const content = gameData?.content || {};
  const contacts = (content.contacts?.groups || []).flatMap((group) => [
    ...(group.personIds || []),
    ...(group.entries || []).map((entry) => entry.id),
  ]);
  const distractors = content.distractors || {};

  return [
    { id: 'gallery', label: '图库', itemIds: (content.gallery?.photos || []).map((item) => `gallery:${item.id}`) },
    { id: 'wechat', label: '微信会话', itemIds: (content.wechat?.chats || []).map((item) => `chat:${item.id}`) },
    { id: 'doorlock', label: '门锁记录', itemIds: (content.doorLock?.events || []).map((item) => `doorlock:${item.id}`) },
    { id: 'contacts', label: '联系人', itemIds: contacts.map((id) => `contacts:${id}`) },
    {
      id: 'market',
      label: '二手交易',
      itemIds: [
        ...(content.marketplace?.listing ? ['market:listing'] : []),
        ...(content.marketplace?.listing?.images || []).map((item) => `market:${item.id}`),
      ],
    },
    {
      id: 'daily',
      label: '日常应用',
      itemIds: [
        ...(distractors.calendar ? ['distractor:calendar'] : []),
        ...(distractors.clock ? ['distractor:clock'] : []),
        ...(distractors.notes?.notes || []).map((item) => `distractor:notes:${item.id}`),
        ...(distractors.express?.packages || []).map((item) => `distractor:express:${item.id}`),
      ],
    },
  ];
}

export function getBrowseItemIds(gameData) {
  return new Set(getBrowseGroups(gameData).flatMap((group) => group.itemIds));
}

export function getBrowseProgress(state, gameData) {
  const read = new Set(Array.isArray(state?.readContentIds) ? state.readContentIds : []);
  const groups = getBrowseGroups(gameData).map((group) => {
    const readCount = group.itemIds.filter((id) => read.has(id)).length;
    const total = group.itemIds.length;
    return {
      ...group,
      readCount,
      total,
      complete: readCount === total,
      percent: total === 0 ? 0 : Math.round((readCount / total) * 100),
    };
  });
  const total = groups.reduce((sum, group) => sum + group.total, 0);
  const readCount = groups.reduce((sum, group) => sum + group.readCount, 0);
  return {
    groups,
    readCount,
    total,
    complete: total > 0 && readCount === total,
    percent: total === 0 ? 0 : Math.round((readCount / total) * 100),
  };
}

// 调查评级：S 同时要求速度、一次提交和零提示；A 放宽提交与提示次数；其余为 B。
export function calculateInvestigationRating(
  { submitCount = 0, hintCount = 0, elapsedSeconds = null },
  ratingConfig
) {
  const submits = Math.max(0, Number(submitCount) || 0);
  const hints = Math.max(0, Number(hintCount) || 0);
  const elapsed = elapsedSeconds == null ? null : Math.max(0, Number(elapsedSeconds) || 0);
  const s = ratingConfig?.S || {};
  const a = ratingConfig?.A || {};

  if (
    elapsed != null &&
    submits <= (s.maxSubmitCount ?? 1) &&
    hints <= (s.maxHintCount ?? 0) &&
    elapsed <= (s.maxSeconds ?? 300)
  ) {
    return 'S';
  }
  if (
    submits <= (a.maxSubmitCount ?? 3) &&
    hints <= (a.maxHintCount ?? 1)
  ) {
    return 'A';
  }
  return 'B';
}

export function calculateCompletionReward(
  elapsedSeconds,
  rewardConfig,
  foundClues = null,
  totalClues = null
) {
  const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
  const tier = [...(rewardConfig.tiers || [])]
    .sort((a, b) => a.maxSeconds - b.maxSeconds)
    .find((item) => elapsed <= item.maxSeconds);
  const timeReward = tier?.points ?? rewardConfig.fallbackPoints ?? 100;

  // 结案积分同时奖励调查速度与线索完整度，避免零线索猜答案获得最高奖励。
  // 未传入线索统计时保留原始时间奖励，便于独立复用与向后兼容。
  if (foundClues == null || totalClues == null) return timeReward;
  const total = Math.max(0, Number(totalClues) || 0);
  if (total === 0) return 0;
  const found = Math.min(total, Math.max(0, Number(foundClues) || 0));
  return Math.round(timeReward * (found / total));
}

// 积分提示兑换：只从“尚未发现且尚未提示”的线索中按时间顺序选择一条。
export function redeemClueHint(state, gameData, cost = 100) {
  const found = new Set(state.observedMaterialIds || []);
  const hinted = new Set(state.hintedMaterialIds || []);
  const next = [...gameData.evidence]
    .sort((a, b) => (a.timelineOrder || 0) - (b.timelineOrder || 0))
    .find((item) => !found.has(item.id) && !hinted.has(item.id));

  if (!next) return { ok: false, reason: 'none', state };
  if ((state.points || 0) < cost) return { ok: false, reason: 'points', state };

  return {
    ok: true,
    clue: next,
    state: {
      ...state,
      points: (state.points || 0) - cost,
      hintedMaterialIds: [...(state.hintedMaterialIds || []), next.id],
    },
  };
}
