const { test, expect } = require('@playwright/test');

test.describe('Display Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should open settings modal', async ({ page }) => {
    await page.click('[title="Settings & Presets"]');
    await expect(page.locator('text=Chat Settings')).toBeVisible();
  });

  test('should switch to Display tab', async ({ page }) => {
    await page.click('[title="Settings & Presets"]');
    await page.click('text=Display');
    await expect(page.locator('text=消息字体大小')).toBeVisible();
  });

  test('should show all display settings sliders', async ({ page }) => {
    await page.click('[title="Settings & Presets"]');
    await page.click('text=Display');

    // 验证所有 Display 设置都显示
    await expect(page.locator('text=消息字体大小')).toBeVisible();
    await expect(page.locator('text=UI 字体大小')).toBeVisible();
    await expect(page.locator('text=间距等级')).toBeVisible();
  });

  test('should reset to defaults', async ({ page }) => {
    await page.click('[title="Settings & Presets"]');
    await page.click('text=Display');

    // 验证恢复默认按钮存在且可点击
    const resetButton = page.locator('text=恢复默认');
    await expect(resetButton).toBeVisible();
    await resetButton.click();

    // 验证设置面板仍然显示（没有被关闭）
    await expect(page.locator('text=消息字体大小')).toBeVisible();
  });

  test('should show default font size value', async ({ page }) => {
    await page.click('[title="Settings & Presets"]');
    await page.click('text=Display');

    // 验证默认值显示正确（14）
    const sliderContainer = page.locator('xpath=//label[contains(text(), "消息字体大小")]/parent::div/parent::div');
    const valueDisplay = sliderContainer.locator('.font-mono');
    await expect(valueDisplay).toHaveText('14');
  });

  test('should have slider input with correct attributes', async ({ page }) => {
    await page.click('[title="Settings & Presets"]');
    await page.click('text=Display');

    // 验证滑块的属性
    const sliderContainer = page.locator('xpath=//label[contains(text(), "消息字体大小")]/parent::div/parent::div');
    const slider = sliderContainer.locator('input[type="range"]');

    // 验证滑块存在且属性正确
    await expect(slider).toHaveAttribute('min', '12');
    await expect(slider).toHaveAttribute('max', '20');
    await expect(slider).toHaveValue('14');
  });
});
