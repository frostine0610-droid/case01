import { expect, test } from '@playwright/test';

const STORAGE_KEY = 'case01-camera-save-v1';
const ALL_EVIDENCE_IDS = ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'E08'];

async function loadSession(page, gameState, screen = 'phone') {
  await page.goto('/');
  await page.evaluate(({ key, session }) => {
    localStorage.setItem(key, JSON.stringify(session));
  }, {
    key: STORAGE_KEY,
    session: { v: 12, screen, gameState },
  });
  await page.reload();
}

test('答错后只标记错误题，修改答案后可以重新提交结案', async ({ page }) => {
  await loadSession(page, {
    observedMaterialIds: ALL_EVIDENCE_IDS,
    hintedMaterialIds: [],
    seenContentIds: [],
    reportSubmitCount: 0,
    investigationStartedAt: Date.now() - 60_000,
  });

  await page.locator('.conclusion-trigger').click();
  const questions = page.locator('.report-q');
  await questions.nth(0).getByRole('button', { name: '20:20' }).click();
  await questions.nth(1).getByRole('button', { name: '沈悦' }).click();
  await questions.nth(2).getByRole('button', { name: '方立' }).click();
  await page.locator('.report-submit-btn').click();

  await expect(page.locator('.report-wrong-hint')).toContainText('门锁');
  await expect(questions.nth(1)).toHaveClass(/is-wrong/);
  await expect(page.locator('.settlement-page')).toHaveCount(0);

  await questions.nth(1).getByRole('button', { name: '方立' }).click();
  await page.locator('.report-submit-btn').click();

  await expect(page.getByText('相机已找回', { exact: true })).toBeVisible();
  await expect(page.locator('.settlement-rating-badge')).toHaveText('A');
  await expect(page.locator('.settlement-stat').filter({ hasText: '报告提交' }).locator('b')).toHaveText('2');
});

test('损坏存档会被清除或清洗，不会进入黑屏和越权结算页', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((key) => localStorage.setItem(key, '{bad json'), STORAGE_KEY);
  await page.reload();

  await expect(page.getByRole('button', { name: /登录并开始值班|解锁手机，开始回想/ })).toBeVisible();
  await expect(page.locator('.fatal-error-page')).toHaveCount(0);

  await page.evaluate(({ key, session }) => {
    localStorage.setItem(key, JSON.stringify(session));
  }, {
    key: STORAGE_KEY,
    session: {
      v: 12,
      screen: 'settlement',
      gameState: {
        points: 'invalid',
        observedMaterialIds: ['E01', 'E01', 'INVALID'],
        hintedMaterialIds: 'not-an-array',
        reportAnswers: { Q1: 'INVALID' },
        endingUnlocked: false,
      },
    },
  });
  await page.reload();

  await expect(page.locator('.phone-page')).toBeVisible();
  await expect(page.getByText('继续核对关键事实', { exact: true })).toBeVisible();
  await expect(page.locator('.settlement-page')).toHaveCount(0);
  await expect(page.locator('.fatal-error-page')).toHaveCount(0);
  await expect.poll(() => page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key));
    return saved.gameState.observedMaterialIds;
  }, STORAGE_KEY)).toEqual(['E01']);
});

test('关键证据链未完整时重复查看同一半线索不解锁，核对另一端后才完整', async ({ page }) => {
  await loadSession(page, {
    observedMaterialIds: ALL_EVIDENCE_IDS.slice(0, 7),
    hintedMaterialIds: [],
    seenContentIds: [],
    reportSubmitCount: 0,
    investigationStartedAt: Date.now() - 60_000,
  });

  const submitConclusion = page.locator('.conclusion-trigger');
  await expect(page.getByText('继续核对关键事实', { exact: true })).toBeVisible();
  await expect(submitConclusion).toBeDisabled();

  await page.getByRole('button', { name: '下一页' }).click();
  await page.getByRole('button', { name: /微信/ }).click();
  await page.getByRole('button', { name: /陈晨/ }).click();
  await page.locator('.wechat-att-product').click();
  const sellerPhone = page.locator('.market-seller-phone');
  await sellerPhone.click();
  await sellerPhone.click();

  await expect(page.locator('.cross-check-status.partial')).toBeVisible();
  await expect(page.getByText('继续核对关键事实', { exact: true })).toBeVisible();
  await expect(submitConclusion).toBeDisabled();
  await expect.poll(() => page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key));
    return saved.gameState.observedMaterialIds.includes('E08');
  }, STORAGE_KEY)).toBe(false);

  await page.getByRole('button', { name: /← 微信/ }).click();
  await page.getByRole('button', { name: '返回手机桌面' }).click();
  await page.getByRole('button', { name: /联系人/ }).click();
  await page.getByRole('button', { name: /方立/ }).click();

  await expect(page.getByText('已记录完整线索', { exact: true })).toBeVisible();
  await expect(page.locator('.case-detail-trigger')).toContainText('关键证据链已完整');
  await expect(submitConclusion).toBeEnabled();
});

test('浏览记录独立于线索，重新开始会清除它并回到身份登录', async ({ page }) => {
  await loadSession(page, {
    observedMaterialIds: ['E01'],
    readContentIds: ['gallery:PHOTO-A'],
    hintedMaterialIds: [],
    seenContentIds: [],
    reportSubmitCount: 0,
    investigationStartedAt: Date.now() - 60_000,
  });

  await page.locator('.browse-trigger').click();
  await expect(page.locator('.browse-panel')).toBeVisible();
  await expect(page.locator('.browse-progress-percent')).not.toHaveText('0%');
  await expect(page.getByText('浏览记录包含与案件无关的日常信息', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '关闭浏览记录' }).click();

  await page.getByRole('button', { name: '重新开始调查' }).click();
  await expect(page.getByText('重新开始调查？', { exact: true })).toBeVisible();
  await page.locator('.restart-confirm-accept').click();
  await expect(page.getByRole('button', { name: /解锁手机，开始回想/ })).toBeVisible();
  await expect.poll(() => page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key));
    return [saved.screen, saved.gameState.observedMaterialIds, saved.gameState.readContentIds];
  }, STORAGE_KEY)).toEqual(['login', [], []]);
});
