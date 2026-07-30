import fs from 'node:fs/promises';
import path from 'node:path';

import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import {
  demoIds,
  docsBackendUrl,
  docsFrontendUrl,
  docsUserEmail,
  docsUserName,
  docsUserPassword,
  screenshotRoot,
} from './constants';
import { seedDocumentationData } from './seed';

const desktopDirectory = path.join(screenshotRoot, 'desktop');
const mobileDirectory = path.join(screenshotRoot, 'mobile');

async function verifyService(url: string, name: string) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `${name} is unavailable at ${url}. Start Trackly with "docker compose up --build" or provide DOCS_FRONTEND_URL and DOCS_BACKEND_URL. ${error instanceof Error ? error.message : ''}`,
    );
  }
}

async function preparePage(page: Page) {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'light');
  });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
      html { scrollbar-width: none !important; }
      body::-webkit-scrollbar { display: none !important; }
      nextjs-portal,
      [data-next-badge],
      [data-nextjs-toast],
      [data-sonner-toaster] {
        display: none !important;
      }
    `,
  });
}

async function settle(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    document.querySelectorAll('nextjs-portal').forEach((element) => {
      element.remove();
    });
  });
}

async function open(
  page: Page,
  route: string,
  expectedHeading: string | RegExp,
) {
  const response = await page.goto(route);
  expect(
    response,
    `Expected ${route} to return a document response`,
  ).not.toBeNull();
  expect(
    response!.status(),
    `Expected ${route} to load successfully`,
  ).toBeLessThan(400);
  await expect(
    page.getByRole('heading', { level: 1, name: expectedHeading }),
  ).toBeVisible();
  await settle(page);
}

async function capture(
  page: Page,
  file: string,
  options: { fullPage?: boolean } = {},
) {
  await settle(page);
  await page.screenshot({
    path: file,
    fullPage: options.fullPage ?? false,
    animations: 'disabled',
  });
}

async function authenticate(page: Page) {
  await open(page, '/login', 'Welcome back');
  await page.getByLabel('Email').fill(docsUserEmail);
  await page.getByLabel('Password').fill(docsUserPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();

  const result = await Promise.race([
    page
      .waitForURL(/\/today(?:\?|$)/, { timeout: 12_000 })
      .then(() => 'authenticated' as const),
    page
      .locator('form [role="alert"]')
      .waitFor({ state: 'visible', timeout: 12_000 })
      .then(() => 'register' as const),
  ]);

  if (result === 'authenticated') return;

  await open(page, '/register', 'Create your account');
  await page.getByLabel('Name').fill(docsUserName);
  await page.getByLabel('Email').fill(docsUserEmail);
  await page.getByLabel('Password', { exact: true }).fill(docsUserPassword);
  await page.getByLabel('Confirm password').fill(docsUserPassword);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/\/today(?:\?|$)/);
}

async function newContextPage(context: BrowserContext) {
  const page = await context.newPage();
  await preparePage(page);
  return page;
}

test('generate publication screenshots', async ({ browser }) => {
  await verifyService(docsFrontendUrl, 'Frontend');
  await verifyService(`${docsBackendUrl}/health`, 'Backend health endpoint');
  await verifyService(`${docsBackendUrl}/ready`, 'Backend readiness endpoint');

  await fs.rm(screenshotRoot, { recursive: true, force: true });
  await fs.mkdir(desktopDirectory, { recursive: true });
  await fs.mkdir(mobileDirectory, { recursive: true });

  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
  });
  const page = await newContextPage(desktop);

  await open(page, '/login', 'Welcome back');
  await capture(page, path.join(desktopDirectory, '01-login.png'));

  await open(page, '/register', 'Create your account');
  await capture(page, path.join(desktopDirectory, '02-register.png'));

  await authenticate(page);
  await seedDocumentationData();

  await open(page, '/today', /Good (morning|afternoon|evening), Trackly/);
  await page.getByLabel('Color theme').selectOption('light');
  await settle(page);
  await capture(page, path.join(desktopDirectory, '03-today-dashboard.png'), {
    fullPage: true,
  });

  await open(page, '/habits?view=all', 'Habits');
  await capture(page, path.join(desktopDirectory, '04-habits-list.png'), {
    fullPage: true,
  });

  await open(page, '/habits/new', 'New habit');
  await capture(page, path.join(desktopDirectory, '05-habit-create.png'), {
    fullPage: true,
  });

  await open(page, `/habits/${demoIds.habits.morningRun}`, 'Morning Run');
  await capture(page, path.join(desktopDirectory, '06-habit-detail.png'), {
    fullPage: true,
  });

  await open(page, '/goals', 'Goals');
  await capture(page, path.join(desktopDirectory, '07-goals.png'), {
    fullPage: true,
  });

  await open(page, `/habits/${demoIds.habits.readPages}`, 'Read 20 Pages');
  const reminders = page
    .getByRole('heading', { name: 'Reminders' })
    .locator('xpath=ancestor::section[1]');
  await expect(reminders).toBeVisible();
  await settle(page);
  await reminders.screenshot({
    path: path.join(desktopDirectory, '08-reminders.png'),
    animations: 'disabled',
  });

  await open(
    page,
    '/analytics?period=week&historyPeriod=30d&heatmapPeriod=90d',
    'Analytics',
  );
  await capture(page, path.join(desktopDirectory, '09-analytics-overview.png'));
  const heatmap = page
    .getByRole('heading', {
      name: 'Contribution heatmap',
    })
    .locator('xpath=ancestor::section[1]');
  await expect(heatmap).toBeVisible();
  await heatmap.scrollIntoViewIfNeeded();
  await settle(page);
  await heatmap.screenshot({
    path: path.join(desktopDirectory, '10-analytics-heatmap.png'),
    animations: 'disabled',
  });

  await open(page, '/settings/preferences', 'Preferences');
  await capture(page, path.join(desktopDirectory, '11-preferences.png'), {
    fullPage: true,
  });

  const storageState = await desktop.storageState();
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'light',
    storageState,
  });
  const mobilePage = await newContextPage(mobile);

  await open(mobilePage, '/today', /Good (morning|afternoon|evening), Trackly/);
  await capture(mobilePage, path.join(mobileDirectory, '01-mobile-today.png'));

  await open(mobilePage, '/habits?view=all', 'Habits');
  await capture(mobilePage, path.join(mobileDirectory, '02-mobile-habits.png'));

  await open(mobilePage, '/today', /Good (morning|afternoon|evening), Trackly/);
  const mobileNavigation = mobilePage.getByRole('navigation', {
    name: 'Mobile navigation',
  });
  await expect(mobileNavigation).toBeVisible();
  await mobileNavigation.screenshot({
    path: path.join(mobileDirectory, '03-mobile-navigation.png'),
    animations: 'disabled',
  });

  await mobile.close();
});
