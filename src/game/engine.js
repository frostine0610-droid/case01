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

export function canSubmitReport(state, gameData) {
  const observed = new Set(state.observedMaterialIds || []);
  return gameData.evidence.every((item) => observed.has(item.id));
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
