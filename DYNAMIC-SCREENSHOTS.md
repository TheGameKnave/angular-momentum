# Dynamic Screenshot Generation for SSR

This guide explains how to use the dynamic screenshot generation system for creating live Open Graph images and social media previews that update as your site changes.

## Overview

The system automatically generates screenshots of your pages for social media previews (Open Graph images). Instead of static images, the screenshots are generated dynamically and cached, ensuring social media platforms always show current content.

## Architecture

### Components

1. **Screenshot Service** ([client/screenshot-service.ts](client/screenshot-service.ts))
   - Uses Puppeteer to capture page screenshots
   - Implements caching with configurable expiration
   - Handles browser lifecycle management
   - Generates unique cache keys based on URL and viewport settings

2. **API Endpoint** ([client/server.ts](client/server.ts):69)
   - Exposes `/api/og-image` endpoint
   - Accepts URL, width, and height parameters
   - Returns PNG images with proper caching headers
   - Handles errors gracefully

3. **SEO Service** ([client/src/app/services/seo.service.ts](client/src/app/services/seo.service.ts))
   - Angular service for managing meta tags
   - Automatically generates screenshot URLs
   - Updates Open Graph and Twitter Card tags
   - Supports custom SEO configuration per route

## Usage

### Basic Implementation

In any Angular component:

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'app-my-page',
  // ... component config
})
export class MyPageComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.updateTags({
      title: 'My Page Title',
      description: 'Page description for search engines and social media',
      type: 'article', // or 'website', 'product', etc.
      twitterCard: 'summary_large_image',
    });
  }
}
```

The SEO service will automatically:
- Set the page title
- Update meta description
- Generate a screenshot URL pointing to `/api/og-image?url=...`
- Update all Open Graph and Twitter Card tags

### Custom Image URL

If you want to use a specific custom image instead of auto-generated screenshots:

```typescript
this.seoService.updateTags({
  title: 'My Page',
  description: 'Description',
  image: 'https://example.com/my-custom-image.png',
});
```

### Direct API Usage

You can also use the screenshot API directly:

```
GET /api/og-image?url=https://example.com/page&width=1200&height=630
```

Parameters:
- `url` (required): The URL to capture
- `width` (optional): Screenshot width (default: 1200)
- `height` (optional): Screenshot height (default: 630)

Response:
- Content-Type: `image/png`
- Cache-Control: `public, max-age=86400` (24 hours)

## Configuration

### Cache Duration

Modify the cache duration in [screenshot-service.ts](client/screenshot-service.ts):

```typescript
const screenshotService = getScreenshotService();
screenshotService.setCacheDuration(12 * 60 * 60 * 1000); // 12 hours
```

### Default SEO Tags

Set global defaults in your app initialization:

```typescript
import { SeoService } from './services/seo.service';

export class AppComponent {
  private readonly seoService = inject(SeoService);

  constructor() {
    this.seoService.setDefaultConfig({
      siteName: 'My Site Name',
      twitterSite: '@myhandle',
      twitterCreator: '@creator',
    });
  }
}
```

### Environment Variables

For production, set the `SITE_URL` environment variable:

```bash
SITE_URL=https://yourdomain.com
```

This ensures correct URLs are generated during SSR.

## How It Works

### Screenshot Generation Flow

1. **Page Request**: Social media crawler requests a page
2. **SSR Rendering**: Angular SSR renders the page with meta tags
3. **Meta Tags**: SEO service injects Open Graph image URL pointing to `/api/og-image`
4. **Image Request**: Crawler requests the image from `/api/og-image`
5. **Cache Check**: Server checks if cached screenshot exists and is valid
6. **Screenshot**: If no cache, Puppeteer generates new screenshot
7. **Caching**: Screenshot is saved to disk with 24-hour expiration
8. **Response**: Image is returned to crawler with cache headers

### Cache Strategy

- **Cache Location**: `.screenshots-cache/` directory (gitignored)
- **Cache Index**: JSON file tracking all cached screenshots
- **Cache Key**: MD5 hash of URL + viewport settings
- **Expiration**: 24 hours (configurable)
- **Invalidation**: Automatic on expiration or manual via `clearCache()`

## Testing

### Test with Social Media Debuggers

After deploying, verify your implementation:

1. **Facebook Sharing Debugger**
   - URL: https://developers.facebook.com/tools/debug/
   - Enter your page URL
   - Click "Scrape Again" to refresh

2. **Twitter Card Validator**
   - URL: https://cards-dev.twitter.com/validator
   - Enter your page URL
   - Preview how cards appear

3. **LinkedIn Post Inspector**
   - URL: https://www.linkedin.com/post-inspector/
   - Enter your page URL
   - Verify preview appearance

### Local Testing

Run the SSR server:

```bash
npm run build
node dist/angular-momentum/server/server.mjs
```

Test the API endpoint:

```bash
curl "http://localhost:4000/api/og-image?url=http://localhost:4000/" > test.png
```

### Example Component

See [dynamic-seo-example.component.ts](client/src/app/examples/dynamic-seo-example.component.ts) for a complete working example.

## Performance Considerations

### Optimization Tips

1. **Cache Duration**: Balance freshness vs. server load
   - Higher duration = less server load
   - Lower duration = more current screenshots

2. **Screenshot Size**: Use appropriate dimensions
   - Facebook: 1200x630 (recommended)
   - Twitter: 1200x600 or 1200x630
   - LinkedIn: 1200x627

3. **Resource Management**:
   - Browser instances are reused across requests
   - Cleanup happens automatically on server shutdown
   - Failed screenshots don't block page rendering

4. **Production Deployment**:
   - Ensure sufficient memory for Puppeteer
   - Consider using persistent storage for cache
   - Monitor cache directory size

### Heroku Configuration

If deploying to Heroku, add the Puppeteer buildpack:

```bash
heroku buildpacks:add jontewks/puppeteer
```

Or add to your `app.json`:

```json
{
  "buildpacks": [
    {
      "url": "heroku/nodejs"
    },
    {
      "url": "https://github.com/jontewks/puppeteer-heroku-buildpack"
    }
  ]
}
```

## Troubleshooting

### Screenshots not generating

- Check server logs for errors
- Verify Puppeteer dependencies are installed
- Ensure sufficient memory is available
- Check that the URL is accessible from the server

### Cache not working

- Verify `.screenshots-cache/` directory exists and is writable
- Check `index.json` file for corruption
- Clear cache manually and restart server

### Meta tags not updating

- Ensure `SeoService.updateTags()` is called in `ngOnInit()`
- Check browser DevTools to verify meta tags are present
- Use "View Page Source" (not DevTools) to see SSR output

### Social media not showing images

- Verify the OG image URL is absolute (not relative)
- Check that the image is publicly accessible
- Clear social media platform cache using their debug tools
- Ensure Content-Type header is `image/png`

## Security Considerations

1. **URL Validation**: The API validates URL parameters to prevent injection
2. **Resource Limits**: Puppeteer has timeouts to prevent hanging
3. **Sandboxing**: Browser runs with security flags enabled
4. **Rate Limiting**: Consider adding rate limiting for production

## Future Enhancements

Potential improvements:

- Add Redis caching for distributed systems
- Implement screenshot queue for high traffic
- Add custom viewport presets (mobile, tablet)
- Support multiple image formats (JPEG, WebP)
- Add watermarking or overlays
- Implement CDN integration
- Add monitoring and analytics

## License

Part of Angular Momentum - see main LICENSE file
