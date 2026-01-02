import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface ScreenshotOptions {
  url: string;
  width?: number;
  height?: number;
  deviceScaleFactor?: number;
  fullPage?: boolean;
}

interface CachedScreenshot {
  path: string;
  timestamp: number;
  hash: string;
}

// Dynamic import types - playwright-chromium uses playwright-core types
type PlaywrightBrowser = Awaited<ReturnType<typeof import('playwright-core')['chromium']['launch']>>;
type PlaywrightPage = Awaited<ReturnType<PlaywrightBrowser['newPage']>>;

/**
 * Service for generating and caching page screenshots using Playwright.
 * Uses dynamic import to avoid ESM/CommonJS bundling issues.
 * Implements file-based caching with configurable expiration.
 */
export class ScreenshotService {
  private browser: PlaywrightBrowser | null = null;
  private readonly cacheDir: string;
  private cacheDuration: number = 24 * 60 * 60 * 1000; // 24 hours
  private screenshotCache: Map<string, CachedScreenshot> = new Map();

  /**
   * Creates a new ScreenshotService instance.
   * @param cacheDir - Directory path for storing cached screenshots
   */
  constructor(cacheDir: string = '.screenshots-cache') {
    this.cacheDir = cacheDir;
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
    this.loadCacheIndex();
  }

  /**
   * Loads the cache index from disk.
   */
  private loadCacheIndex(): void {
    const indexPath = join(this.cacheDir, 'index.json');
    if (existsSync(indexPath)) {
      try {
        const data = JSON.parse(readFileSync(indexPath, 'utf-8'));
        this.screenshotCache = new Map(Object.entries(data));
      } catch {
        // Failed to load cache index, starting fresh
      }
    }
  }

  /**
   * Saves the cache index to disk.
   */
  private saveCacheIndex(): void {
    const indexPath = join(this.cacheDir, 'index.json');
    try {
      const data = Object.fromEntries(this.screenshotCache);
      writeFileSync(indexPath, JSON.stringify(data, null, 2));
    } catch {
      // Failed to save cache index
    }
  }

  /**
   * Generates a unique cache key based on screenshot options.
   * @param options - Screenshot configuration options
   * @returns MD5 hash of the options
   */
  private generateCacheKey(options: ScreenshotOptions): string {
    const keyString = JSON.stringify(options);
    return createHash('md5').update(keyString).digest('hex');
  }

  /**
   * Initializes the Playwright browser instance if not already running.
   * Downloads browser at runtime if not present (for Heroku slug size limits).
   * Uses dynamic import to avoid bundling issues with ESM.
   * @returns Promise that resolves when browser is ready
   */
  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      // Set browser path for Heroku deployment
      // Browsers are installed to /app/client/pw-browsers during heroku-postbuild
      if (!process.env['PLAYWRIGHT_BROWSERS_PATH']) {
        process.env['PLAYWRIGHT_BROWSERS_PATH'] = '/app/client/pw-browsers';
      }

      // Dynamic import to avoid ESM bundling issues with Playwright
      // Using playwright-chromium (smaller than full playwright package)
      const playwright = await import('playwright-chromium');

      this.browser = await playwright.chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });
    }
  }

  /**
   * Captures a screenshot of the specified URL.
   * Returns cached screenshot if available and not expired.
   * @param options - Screenshot configuration including URL and viewport settings
   * @returns Promise resolving to screenshot image buffer
   */
  async capture(options: ScreenshotOptions): Promise<Buffer> {
    const {
      url,
      width = 1200,
      height = 630,
      deviceScaleFactor = 2,
      fullPage = false,
    } = options;

    const cacheKey = this.generateCacheKey(options);
    const cached = this.screenshotCache.get(cacheKey);

    // Check if cached screenshot is still valid
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      const cachedPath = join(this.cacheDir, cached.path);
      if (existsSync(cachedPath)) {
        return readFileSync(cachedPath);
      }
    }

    await this.initBrowser();
    let page: PlaywrightPage | null = null;

    try {
      page = await this.browser!.newPage({
        viewport: {
          width,
          height,
        },
        deviceScaleFactor,
      });

      // Set a reasonable timeout for page load
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 10000,
      });

      // Wait a bit for dynamic content to render
      await page.waitForTimeout(1000);

      // Hide UI elements that shouldn't appear in social previews
      await page.evaluate(() => {
        const selectorsToHide = [
          'app-cookie-banner',      // Cookie consent banner
          '.cookie-banner',         // Alternative cookie banner class
          '.p-toast',               // PrimeNG toast notifications
          '[role="alertdialog"]',   // Alert dialogs
        ];
        for (const selector of selectorsToHide) {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            (el as HTMLElement).style.display = 'none';
          });
        }
      });

      const screenshot = await page.screenshot({
        type: 'png',
        fullPage,
      });

      // Cache the screenshot (ensure directory exists in case it was deleted)
      if (!existsSync(this.cacheDir)) {
        mkdirSync(this.cacheDir, { recursive: true });
      }
      const filename = `${cacheKey}.png`;
      const filePath = join(this.cacheDir, filename);
      writeFileSync(filePath, new Uint8Array(screenshot));

      this.screenshotCache.set(cacheKey, {
        path: filename,
        timestamp: Date.now(),
        hash: cacheKey,
      });
      this.saveCacheIndex();

      return screenshot;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Closes the browser instance and cleans up resources.
   * @returns Promise that resolves when cleanup is complete
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Clears all cached screenshots from memory and updates the index file.
   */
  clearCache(): void {
    this.screenshotCache.clear();
    this.saveCacheIndex();
  }

  /**
   * Sets the cache duration for screenshots.
   * @param durationMs - Cache duration in milliseconds
   */
  setCacheDuration(durationMs: number): void {
    this.cacheDuration = durationMs;
  }
}

// Singleton instance
let screenshotService: ScreenshotService | null;

/**
 * Gets or creates the singleton screenshot service instance.
 * @returns The shared ScreenshotService instance
 */
export function getScreenshotService(): ScreenshotService {
  screenshotService ??= new ScreenshotService();
  return screenshotService;
}
