import { expect, test } from '@playwright/test';

const FEATURE_KEYS = [
  'core.dashboard',
  'core.integration_health',
  'module.assets',
  'module.engineering',
  'module.timing',
  'module.capacity',
  'module.execution',
  'module.execution.mobile',
  'module.quality',
  'module.excellence',
  'module.meetings',
  'module.documents',
  'module.documents.editor',
  'module.diagram',
  'module.simulation',
  'module.white_label_admin',
];

const FEATURE_FLAG_MAP = Object.fromEntries(
  FEATURE_KEYS.map((featureKey) => [featureKey, { enabled: true, rollout: 'ga' }]),
);

const FEATURE_FLAG_LIST = FEATURE_KEYS.map((featureKey) => ({
  feature_key: featureKey,
  is_enabled: true,
  rollout: 'ga',
  notes: null,
  updated_by: 'e2e',
  updated_at: new Date().toISOString(),
}));

function json(route, payload, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

async function installApiMocks(page) {
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method().toUpperCase();

    if (path === '/api/auth/me') {
      return json(route, {
        username: 'admin',
        role: 'admin',
        display_name: 'Administrador',
        tenant_id: 'default',
        feature_profile: 'full',
      });
    }

    if (path === '/api/platform/runtime') {
      return json(route, {
        tenant: { code: 'default', name: 'DEFAULT', profile: 'full' },
        theme: {
          brand_name: 'TAKTA',
          badge_label: 'OAC-SEO',
          colors: { brand_orange: '#f97316' },
          typography: {},
          custom_css: null,
        },
        ui_config: { menu: [], modules: {} },
        feature_flags: FEATURE_FLAG_MAP,
      });
    }

    if (path === '/api/platform/tenants') {
      return json(route, [{ code: 'default', name: 'DEFAULT', profile: 'full', is_active: true }]);
    }

    if (path === '/api/platform/feature-flags') {
      if (method === 'GET') {
        return json(route, { tenant_code: 'default', flags: FEATURE_FLAG_LIST });
      }
      return json(route, { ok: true });
    }

    if (path === '/api/platform/integration/health/latest') {
      return json(route, {
        tenant_code: 'default',
        status: 'ok',
        orphan_count: 0,
        mismatch_count: 0,
        warning_count: 0,
        summary: {},
      });
    }

    if (path === '/api/platform/integration/health/dashboard') {
      return json(route, {
        tenant_code: 'default',
        days: 10,
        status_counts: { ok: 1, warning: 0, critical: 0 },
        latest: {
          status: 'ok',
          orphan_count: 0,
          mismatch_count: 0,
          warning_count: 0,
          created_at: new Date().toISOString(),
        },
        history: [],
      });
    }

    if (path === '/api/platform/integration/events/catalog') {
      return json(route, { catalog: { integration: ['context.summary.requested'] } });
    }

    if (path === '/api/platform/integration/events') {
      if (method === 'POST') {
        return json(route, { id: 'evt-e2e', created_at: new Date().toISOString() });
      }
      return json(route, []);
    }

    if (path.startsWith('/api/platform/')) {
      if (method === 'GET') return json(route, {});
      return json(route, { ok: true });
    }

    if (method === 'GET') {
      return json(route, []);
    }
    return json(route, { ok: true });
  });
}

async function bootstrapAuthenticatedShell(page, hash, viewport, expectMobileToggle = false) {
  await page.addInitScript(() => {
    localStorage.setItem('takta_token', 'e2e-token');
    localStorage.setItem('takta.tenant_code', 'default');
  });
  await installApiMocks(page);
  if (viewport) {
    await page.setViewportSize(viewport);
  }
  await page.goto(hash, { waitUntil: 'domcontentloaded' });
  if (expectMobileToggle) {
    await expect(page.locator('#toggle-sidebar-btn')).toBeVisible();
  } else {
    await expect(page.locator('#toggle-sidebar-btn')).toBeAttached();
  }
}

test('sidebar mobile responde con toggle, Escape y overlay sin scroll horizontal', async ({ page }) => {
  await bootstrapAuthenticatedShell(page, '/#/', { width: 375, height: 812 }, true);

  const sidebar = page.locator('#app-sidebar');
  const overlay = page.locator('#sidebar-overlay');

  await page.click('#toggle-sidebar-btn');
  await expect
    .poll(async () => page.evaluate(() => {
      const bodyLocked = document.body?.classList.contains('sidebar-lock');
      const htmlLocked = document.documentElement?.classList.contains('sidebar-lock');
      return Boolean(bodyLocked || htmlLocked);
    }))
    .toBe(true);
  await expect(sidebar).toHaveAttribute('aria-hidden', 'false');
  await expect
    .poll(async () => page.evaluate(() => {
      const node = document.querySelector('#sidebar-overlay');
      return node ? node.classList.contains('hidden') : true;
    }))
    .toBe(false);

  await page.keyboard.press('Escape');
  await expect
    .poll(async () => page.evaluate(() => {
      const bodyLocked = document.body?.classList.contains('sidebar-lock');
      const htmlLocked = document.documentElement?.classList.contains('sidebar-lock');
      return Boolean(bodyLocked || htmlLocked);
    }))
    .toBe(false);
  await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
  await expect
    .poll(async () => page.evaluate(() => {
      const node = document.querySelector('#sidebar-overlay');
      return node ? node.classList.contains('hidden') : false;
    }))
    .toBe(true);

  await page.click('#toggle-sidebar-btn');
  await expect(sidebar).toHaveAttribute('aria-hidden', 'false');
  await expect
    .poll(async () => page.evaluate(() => {
      const node = document.querySelector('#sidebar-overlay');
      return node ? node.classList.contains('hidden') : true;
    }))
    .toBe(false);
  await page.evaluate(() => {
    const node = document.querySelector('#sidebar-overlay');
    if (node) {
      node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
  await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
  await expect
    .poll(async () => page.evaluate(() => {
      const node = document.querySelector('#sidebar-overlay');
      return node ? node.classList.contains('hidden') : false;
    }))
    .toBe(true);

  const noHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(noHorizontalScroll).toBeTruthy();
});

test('settings expone controles PWA y mantiene layout estable en desktop', async ({ page }) => {
  await bootstrapAuthenticatedShell(page, '/#/settings', { width: 1366, height: 900 }, false);

  await expect(page.locator('#settings-pwa-check-update')).toBeVisible();
  await expect(page.locator('#settings-pwa-status')).toContainText('PWA');
  await page.click('#settings-pwa-check-update');
  await expect(page.locator('#settings-pwa-status')).not.toBeEmpty();

  const sidebarVisible = await page.evaluate(() => {
    const node = document.querySelector('#app-sidebar');
    if (!node) return false;
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    return style.display !== 'none' && rect.width > 0;
  });
  expect(sidebarVisible).toBeTruthy();

  const noHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(noHorizontalScroll).toBeTruthy();
});
