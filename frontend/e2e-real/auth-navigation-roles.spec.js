import { expect, test } from '@playwright/test';

const USERS = [
  {
    username: 'admin',
    password: 'admin123',
    roleLabel: 'admin',
    routes: [
      { route: '/#/assets', expectedHash: /#\/assets/, visibleSelector: '#asset-tree-container' },
      { route: '/#/settings', expectedHash: /#\/settings/, visibleSelector: '#settings-pwa-check-update' },
    ],
  },
  {
    username: 'ingeniero',
    password: 'takta2026',
    roleLabel: 'engineer',
    routes: [
      { route: '/#/engineering', expectedHash: /#\/engineering/, visibleSelector: '#eng-tabs' },
      { route: '/#/meetings', expectedHash: /#\/meetings/, visibleSelector: '#meeting-save' },
    ],
  },
  {
    username: 'supervisor',
    password: 'takta2026',
    roleLabel: 'supervisor',
    routes: [
      { route: '/#/execution', expectedHash: /#\/execution/, visibleSelector: '#execution-body' },
      { route: '/#/weight-sampling', expectedHash: /#\/weight-sampling/, visibleSelector: '#ws-spec-form' },
    ],
  },
];

async function authenticateViaApi(page, request, { username, password }) {
  const response = await request.post('http://127.0.0.1:9003/api/auth/login', {
    data: { username, password },
  });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  const token = data?.access_token;
  expect(token).toBeTruthy();

  await page.addInitScript((authToken) => {
    localStorage.setItem('takta_token', authToken);
  }, token);

  await page.goto('/#/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#logout-btn')).toBeVisible({ timeout: 30_000 });
}

async function assertRouteLoads(page, routeCheck) {
  await page.goto(routeCheck.route, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(routeCheck.expectedHash);
  await expect(page.locator(routeCheck.visibleSelector)).toBeVisible();
  await expect(page.locator('#app-content')).not.toContainText('Error loading page.');
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

for (const user of USERS) {
  test(`auth real + navegacion por rol (${user.username})`, async ({ page, request }) => {
    await authenticateViaApi(page, request, user);

    await expect(page.locator('#app-navbar')).toContainText(user.roleLabel);
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem('takta.tenant_code')))
      .toBeTruthy();

    for (const routeCheck of user.routes) {
      await assertRouteLoads(page, routeCheck);
    }
  });
}

test('settings expone estado PWA y tenant con backend real', async ({ page, request }) => {
  await authenticateViaApi(page, request, { username: 'admin', password: 'admin123' });

  await page.click('#nav-settings');
  await expect(page).toHaveURL(/#\/settings/);
  await expect(page.locator('#settings-pwa-status')).toContainText('PWA');
  const tenantOptions = await page.locator('#settings-tenant-select option').count();
  expect(tenantOptions).toBeGreaterThan(0);
  await expect(page.locator('#settings-pwa-check-update')).toBeVisible();
});
