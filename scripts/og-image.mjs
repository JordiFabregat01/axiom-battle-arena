// Renders the social preview image (public/og.png, 1200×630) from the running app's gallery page,
// so it always shows the current card art. Re-run after adding cards and before deploying.
// Usage: npm run og   (needs the app running; default http://localhost:4173, override with OG_URL)
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const url = `${process.env.OG_URL ?? 'http://localhost:4173'}/#/gallery?filter=art`;
const exe = BROWSERS.find((p) => existsSync(p));
if (!exe) { console.error('No Chrome/Edge found'); process.exit(1); }

const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle2' });
await page.waitForSelector('.card-grid .card', { timeout: 20000 });
await new Promise((r) => setTimeout(r, 1500));
const png = await page.screenshot({ type: 'png' });
await browser.close();
const out = join(ROOT, 'public', 'og.jpg');
await sharp(png).jpeg({ quality: 84, mozjpeg: true }).toFile(out);
console.log(`wrote public/og.jpg from ${url}`);
