import puppeteer, { Browser, Page } from 'puppeteer';
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

/**
 * Service for generating and caching page screenshots using Puppeteer.
 * Implements file-based caching with configurable expiration.
 */
export class ScreenshotService {
  private browser: Browser | null = null;
  private cacheDir: string;
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
      } catch (err) {
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
    } catch (err) {
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
   * Initializes the Puppeteer browser instance if not already running.
   * @returns Promise that resolves when browser is ready
   */
  private async initBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
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
    let page: Page | null = null;

    try {
      page = await this.browser!.newPage();

      await page.setViewport({
        width,
        height,
        deviceScaleFactor,
      });

      // Set a reasonable timeout for page load
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 10000,
      });

      // Wait a bit for dynamic content to render
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const screenshot = await page.screenshot({
        type: 'png',
        fullPage,
      });

      // Cache the screenshot
      const filename = `${cacheKey}.png`;
      const filePath = join(this.cacheDir, filename);
      writeFileSync(filePath, screenshot);

      this.screenshotCache.set(cacheKey, {
        path: filename,
        timestamp: Date.now(),
        hash: cacheKey,
      });
      this.saveCacheIndex();

      return screenshot as Buffer;
    } catch (err) {
      throw err;
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
let screenshotService: ScreenshotService | null = null;

/**
 * Gets or creates the singleton screenshot service instance.
 * @returns The shared ScreenshotService instance
 */
export function getScreenshotService(): ScreenshotService {
  if (!screenshotService) {
    screenshotService = new ScreenshotService();
  }
  return screenshotService;
}
