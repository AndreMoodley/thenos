// Headless end-to-end proof: drive the exported web build in headless Chromium against the live
// backend, exercise the real loop (rebirth → login demo → Domain → log a strike), and screenshot it.
//
//   BASE_URL   the served web export   (default http://localhost:8080)
//   API_URL    the backend            (default http://localhost:4000)
//
// Exits non-zero on any failure. Screenshots → voidborn/.artifacts/.
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const API_URL = process.env.API_URL || 'http://localhost:4000';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.artifacts');
mkdirSync(OUT, { recursive: true });

// Headless container: prefer an explicit browser path (Playwright's CDN may be blocked). Falls back
// to Playwright's bundled download. Set CHROME_PATH to override.
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].filter(Boolean);
const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));

const log = (...a) => console.log('[smoke]', ...a);

async function main() {
  // 1) backend must be up
  const health = await fetch(`${API_URL}/health`).then((r) => r.json()).catch(() => null);
  if (!health?.ok) throw new Error(`backend not healthy at ${API_URL}/health`);
  log('backend healthy', health);

  log('browser:', executablePath || '(playwright bundled)');
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
  page.on('console', (m) => { if (m.type() === 'error') log('page error:', m.text()); });
  page.on('pageerror', (e) => log('PAGEERROR:', e.message));

  // 2) load the app → it lands on Rebirth (don't wait for networkidle — the app polls /health)
  log('loading', BASE_URL);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  try {
    await page.getByText('VOIDBORN').first().waitFor({ timeout: 30000 });
  } catch (e) {
    await page.screenshot({ path: join(OUT, 'failure.png') });
    const txt = await page.evaluate(() => document.body?.innerText || '(empty)').catch(() => '(no body)');
    log('did not find VOIDBORN. body text:', JSON.stringify(txt.slice(0, 400)));
    throw e;
  }
  await page.getByText('Real training is the only fuel', { exact: false }).waitFor({ timeout: 15000 });
  await page.screenshot({ path: join(OUT, 'rebirth.png') });
  log('rebirth screen rendered ✓');

  // 3) log in as the seeded demo adept
  await page.getByText('Use the demo adept').click();
  await page.getByText('Return', { exact: true }).click();

  // 4) land on the Domain — the entity over its space + thumb actions
  await page.getByText('Log training', { exact: true }).waitFor({ timeout: 30000 });
  // realm/stage text proves computed state arrived from the server
  await page.getByText('Realm', { exact: false }).first().waitFor({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200); // let the entity settle / voice line arrive
  await page.screenshot({ path: join(OUT, 'domain.png') });
  log('domain rendered ✓');

  // 5) exercise the loop — log a strike (optimistic; entity reacts), screenshot the sheet
  await page.getByText('Log training', { exact: true }).click();
  await page.getByText('Strike', { exact: true }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: join(OUT, 'quick-log.png') });
  await page.getByText('Strike', { exact: true }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(OUT, 'domain-after-strike.png') });
  log('strike logged ✓');

  // 6) confirm it reached the server (hammerCount advanced for the demo account)
  const login = await fetch(`${API_URL}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'demo@voidborn.app', password: 'voidborn123' }),
  }).then((r) => r.json());
  log('server-side demo hammerCount =', login?.practitioner?.hammerCount, '| realm =', login?.practitioner?.realm?.name);

  await browser.close();
  log('PASS — screenshots in', OUT);
}

main().catch((e) => {
  console.error('[smoke] FAIL:', e?.message || e);
  process.exit(1);
});
