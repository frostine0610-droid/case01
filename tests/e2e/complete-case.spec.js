import { expect, test } from '@playwright/test';

async function openGalleryClue(page, title, inspectLabel) {
  await page.locator(`button[title*="${title}"]`).click();
  await page.getByRole('button', { name: new RegExp(inspectLabel) }).click();
  await page.getByRole('button', { name: /← 图库/ }).click();
}

test('完整调查：半线索合并、关键证据链完整后解锁并正确结案', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.locator('.login-page').click();
  await page.getByRole('button', { name: /解锁手机，开始回想/ }).click();
  await page.getByRole('button', { name: /跳过/ }).click();
  await page.getByRole('button', { name: /开始检查手机/ }).click();

  const submitConclusion = page.locator('.conclusion-trigger');
  await expect(submitConclusion).toBeDisabled();

  await page.getByRole('button', { name: /图库/ }).click();
  await openGalleryClue(page, '器材登记照', '检查相机和相机包的细节');
  await openGalleryClue(page, '活动结束时的器材柜', '查看拍摄时间与柜内物品');
  await openGalleryClue(page, '走廊收尾照', '放大照片右侧');
  await page.getByRole('button', { name: '返回手机桌面' }).click();

  await page.getByRole('button', { name: '下一页' }).click();
  await page.getByRole('button', { name: /微信/ }).click();
  await page.getByRole('button', { name: /摄影社作品展/ }).click();
  await page.getByRole('button', { name: '查看消息详情', exact: true }).click();
  await page.getByRole('button', { name: /一楼大厅照片/ }).click();
  await page.getByRole('button', { name: '确定' }).click();
  await page.getByRole('button', { name: /付款截图/ }).click();
  await page.getByRole('button', { name: '确定' }).click();
  await page.getByRole('button', { name: /← 微信/ }).click();

  await page.getByRole('button', { name: /下拉查看小程序/ }).click();
  await page.getByRole('button', { name: /304 门锁/ }).click();
  await page.getByRole('button', { name: /开门记录/ }).click();
  await page.getByRole('button', { name: /20:46.*方立.*离开/ }).click();
  await page.getByRole('button', { name: /← 智慧活动室/ }).click();
  await page.getByRole('button', { name: /← 微信/ }).click();

  await page.getByRole('button', { name: /陈晨/ }).click();
  await page.locator('.wechat-att-product').click();
  await page.getByRole('button', { name: /相机正面 3 张/ }).click();
  await page.getByRole('button', { name: /对比器材登记照/ }).click();
  await page.getByRole('button', { name: '确定' }).click();
  await page.locator('.market-seller-phone').click();
  const halfClue = page.locator('.cross-check-status.partial');
  await expect(halfClue.getByText('已标记为半条线索', { exact: true })).toBeVisible();
  await expect(halfClue.getByText('努力找找与其相互呼应的线索吧。')).toBeVisible();
  await page.getByRole('button', { name: /← 微信/ }).click();
  await page.getByRole('button', { name: '返回手机桌面' }).click();

  await page.getByRole('button', { name: /联系人/ }).click();
  await page.getByRole('button', { name: /方立/ }).click();
  await expect(page.getByText('已记录完整线索', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '返回手机桌面' }).click();

  await expect(page.locator('.case-detail-trigger')).toContainText('关键证据链已完整');
  await expect(submitConclusion).toBeEnabled();
  await submitConclusion.click();

  const questions = page.locator('.report-q');
  await questions.nth(0).getByRole('button', { name: '20:20' }).click();
  await questions.nth(1).getByRole('button', { name: '方立' }).click();
  await questions.nth(2).getByRole('button', { name: '方立' }).click();
  await page.getByRole('button', { name: /提交/ }).last().click();

  await expect(page.getByText('相机已找回', { exact: true })).toBeVisible();
  await expect(page.getByText('已结案', { exact: true })).toBeVisible();
  await expect(page.locator('.settlement-rating-badge')).toHaveText('S');
  await expect(page.locator('.settlement-stat').filter({ hasText: '使用提示' }).locator('b')).toHaveText('0');
});
