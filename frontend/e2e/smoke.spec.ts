import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.API_URL ?? 'http://127.0.0.1:8000';

test('critical user journey smoke', async ({ page, request }) => {
  const nonce = Date.now();
  const username = `e2e_${nonce}`;
  const email = `${username}@example.com`;
  const password = 'password123';
  const experimentName = `E2E experiment ${nonce}`;

  await page.goto('/register');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page).toHaveURL(/\/experiments/);

  await page.getByRole('button', { name: 'New experiment' }).click();
  await page.getByLabel('Name').fill(experimentName);
  await page.getByLabel('Description').fill('E2E flow');
  await page.getByRole('button', { name: 'Create experiment' }).click();

  await page.getByRole('link', { name: experimentName }).click();
  await expect(page).toHaveURL(/\/experiments\/\d+/);

  await page.getByRole('button', { name: 'Metrics' }).click();
  await page.getByLabel('Name').fill('Conversion');
  await page.getByRole('button', { name: 'Add metric' }).click();

  await page.getByRole('button', { name: 'Variants' }).click();
  await page.getByLabel('Name').fill('Control');
  await page.getByLabel('Allocation %').fill('50');
  await page.getByLabel('Control').check();
  await page.getByRole('button', { name: 'Add variant' }).click();

  await page.getByLabel('Name').fill('Treatment');
  await page.getByLabel('Allocation %').fill('50');
  await page.getByLabel('Control').uncheck();
  await page.getByRole('button', { name: 'Add variant' }).click();

  const token = await page.evaluate(() => localStorage.getItem('experimentation_copilot.token'));
  expect(token).toBeTruthy();

  const experimentId = Number(new URL(page.url()).pathname.split('/').pop());
  expect(experimentId).toBeGreaterThan(0);

  const authHeader = ['Bearer', token ?? ''].join(' ');
  const metricResponse = await request.get(`${apiBaseUrl}/api/experiments/${experimentId}/metrics`, {
    headers: { Authorization: authHeader },
  });
  expect(metricResponse.ok()).toBeTruthy();
  const metricsPayload = await metricResponse.json();
  const metricId = metricsPayload.metrics[0].id as number;

  await page.getByRole('button', { name: 'Planning' }).click();
  await page.getAllByLabel('Metric ID').first().fill(String(metricId));
  await page.getAllByRole('button', { name: /^Calculate$/ }).first().click();
  await expect(page.getByText('Required sample size per variant')).toBeVisible();

  await page.getByRole('button', { name: 'Analysis' }).click();
  await page.getByLabel('Metric ID').fill(String(metricId));
  await page.getByLabel('Variant A successes').fill('50');
  await page.getByLabel('Variant A total').fill('1000');
  await page.getByLabel('Variant B successes').fill('70');
  await page.getByLabel('Variant B total').fill('1000');
  await page.getByRole('button', { name: 'Run analysis' }).click();

  await expect(page.getByText('Started run')).toBeVisible();

  let completed = false;
  for (let i = 0; i < 10; i += 1) {
    await page.getByRole('button', { name: 'Refresh status' }).click();
    const statusText = await page.locator('dt:has-text("Status") + dd').innerText();
    if (statusText.toLowerCase().includes('completed')) {
      completed = true;
      break;
    }
    await page.waitForTimeout(1500);
  }

  expect(completed).toBeTruthy();
});
