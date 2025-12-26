import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from '../services/seo.service';

/**
 * Example component demonstrating how to use the SEO service
 * for dynamic Open Graph images and meta tags.
 *
 * This component shows how to:
 * 1. Update page-specific SEO tags
 * 2. Generate dynamic screenshots for social media previews
 * 3. Customize meta tags based on content
 */
@Component({
  selector: 'app-dynamic-seo-example',
  standalone: true,
  template: `
    <div class="example-container">
      <h1>Dynamic SEO Example</h1>
      <p>
        This page demonstrates dynamic Open Graph image generation.
        When shared on social media, it will show a live screenshot of this page.
      </p>

      <div class="info-box">
        <h2>How it works:</h2>
        <ul>
          <li>The SEO service automatically generates a screenshot URL for this page</li>
          <li>Social media crawlers fetch the screenshot from /api/og-image endpoint</li>
          <li>Screenshots are cached for 24 hours to improve performance</li>
          <li>The image updates automatically when content changes</li>
        </ul>
      </div>

      <div class="test-section">
        <h3>Test with these tools:</h3>
        <ul>
          <li><a href="https://developers.facebook.com/tools/debug/" target="_blank">Facebook Sharing Debugger</a></li>
          <li><a href="https://cards-dev.twitter.com/validator" target="_blank">Twitter Card Validator</a></li>
          <li><a href="https://www.linkedin.com/post-inspector/" target="_blank">LinkedIn Post Inspector</a></li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .example-container {
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }

    .info-box {
      background: var(--surface-card);
      padding: 1.5rem;
      border-radius: 8px;
      margin: 2rem 0;
    }

    .test-section {
      margin-top: 2rem;
    }

    ul {
      margin: 1rem 0;
    }

    li {
      margin: 0.5rem 0;
    }
  `],
})
export class DynamicSeoExampleComponent implements OnInit {
  private readonly seoService = inject(SeoService);

  /**
   * Initializes component and sets SEO meta tags for dynamic screenshot demonstration.
   */
  ngOnInit(): void {
    // Update SEO tags for this page
    this.seoService.updateTags({
      title: 'Dynamic SEO Example - Angular Momentum',
      description: 'Learn how to implement dynamic Open Graph images with server-side rendering in Angular. Screenshots update automatically as your content changes.',
      type: 'article',
      twitterCard: 'summary_large_image',
      // The image URL will be automatically generated to point to /api/og-image
      // You can also specify a custom image URL here if needed
    });
  }
}
