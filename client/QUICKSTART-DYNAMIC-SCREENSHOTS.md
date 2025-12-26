# Quick Start: Dynamic Screenshots for SSR

This guide will get you up and running with dynamic Open Graph images in 5 minutes.

## What You Get

When you share your Angular app on social media (Facebook, Twitter, LinkedIn), instead of showing a static image, it will show a **live screenshot** of your page that updates automatically as content changes.

## Prerequisites

- Angular SSR already set up (✅ you have this)
- Node.js server running (✅ you have this)
- Puppeteer installed (✅ already done)

## Step 1: Use the SEO Service in Your Components

Add this to any component where you want custom social media previews:

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from './services/seo.service';

@Component({
  selector: 'app-my-page',
  // ... your component config
})
export class MyPageComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    // This will automatically generate a dynamic screenshot!
    this.seoService.updateTags({
      title: 'My Awesome Page',
      description: 'This will appear on social media',
      type: 'article',
    });
  }
}
```

That's it! The SEO service will:
- ✅ Set your page title
- ✅ Add meta description
- ✅ Generate a screenshot URL automatically
- ✅ Update all Open Graph and Twitter Card tags

## Step 2: Build and Run

```bash
# Build the application
cd client
npm run build

# Start the SSR server
node dist/angular-momentum/server/server.mjs
```

Your app is now running with dynamic screenshot support!

## Step 3: Test It

### Quick API Test

Test the screenshot API directly:

```bash
curl "http://localhost:4000/api/og-image?url=http://localhost:4000/" -o screenshot.png
```

Open `screenshot.png` to see the generated image.

### Test with Social Media

1. **Deploy your app** (or use ngrok for local testing)
2. **Test with Facebook Debugger**: https://developers.facebook.com/tools/debug/
   - Paste your URL
   - Click "Scrape Again"
   - You should see a live screenshot!

3. **Test with Twitter**: https://cards-dev.twitter.com/validator
   - Paste your URL
   - See the preview

## How It Works

```
┌─────────────────┐
│ Your Component  │ calls seoService.updateTags()
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   SEO Service   │ generates meta tags with screenshot URL
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   SSR renders   │ page with meta tags
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Social crawler  │ fetches /api/og-image
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Puppeteer     │ captures screenshot (cached 24h)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Returns PNG    │ to social media platform
└─────────────────┘
```

## Configuration Options

### Basic Usage

```typescript
seoService.updateTags({
  title: 'Page Title',
  description: 'Page description',
});
```

### Advanced Usage

```typescript
seoService.updateTags({
  title: 'My Article',
  description: 'Article description',
  type: 'article',                    // article, website, product, etc.
  twitterCard: 'summary_large_image', // card type
  twitterSite: '@myhandle',           // your Twitter handle
  image: 'custom-url.png',            // optional: use custom image instead
});
```

### Global Defaults

Set once in your app component:

```typescript
export class AppComponent {
  private readonly seoService = inject(SeoService);

  constructor() {
    this.seoService.setDefaultConfig({
      siteName: 'My Site',
      twitterSite: '@myhandle',
    });
  }
}
```

## Caching

Screenshots are cached for **24 hours** by default.

- First request: Generates screenshot (~2-3 seconds)
- Subsequent requests: Serves from cache (instant)
- Cache location: `.screenshots-cache/` (gitignored)

### Clear Cache

If you need to clear the cache:

```typescript
import { getScreenshotService } from './screenshot-service';

const screenshotService = getScreenshotService();
screenshotService.clearCache();
```

### Change Cache Duration

```typescript
// Set to 12 hours
screenshotService.setCacheDuration(12 * 60 * 60 * 1000);
```

## Production Deployment

### Environment Variable

Set your production URL:

```bash
export SITE_URL=https://yourdomain.com
```

### Heroku

Add the Puppeteer buildpack:

```bash
heroku buildpacks:add jontewks/puppeteer
```

### Docker

Ensure Puppeteer dependencies are installed:

```dockerfile
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils
```

## Troubleshooting

### Screenshots not working?

**Check server logs** for errors:
```bash
node dist/angular-momentum/server/server.mjs
```

**Verify Puppeteer installed**:
```bash
npm list puppeteer
```

**Test the endpoint directly**:
```bash
curl http://localhost:4000/api/og-image?url=http://localhost:4000/
```

### Social media not showing images?

1. **Use absolute URLs** - The image URL must be publicly accessible
2. **Clear platform cache** - Use Facebook/Twitter debug tools
3. **Check HTTPS** - Many platforms require HTTPS
4. **Verify meta tags** - View page source (not DevTools)

### Memory issues?

Puppeteer can be memory-intensive:
- Increase Node.js memory: `node --max-old-space-size=4096 server.mjs`
- Reduce cache duration to clear screenshots more often
- Consider using a queue for high-traffic sites

## Example Component

See [dynamic-seo-example.component.ts](src/app/examples/dynamic-seo-example.component.ts) for a complete working example.

## Full Documentation

For more details, see [DYNAMIC-SCREENSHOTS.md](../DYNAMIC-SCREENSHOTS.md)

## Summary

1. ✅ Puppeteer installed
2. ✅ Screenshot service created
3. ✅ API endpoint added at `/api/og-image`
4. ✅ SEO service available for use
5. ✅ Caching implemented (24-hour default)

**You're ready to go!** Just import `SeoService` and call `updateTags()` in your components.

Happy sharing! 🚀
