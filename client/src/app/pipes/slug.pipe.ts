// client/src/app/pipes/slug.pipe.ts
import { Injectable, Pipe, PipeTransform } from '@angular/core';

/**
 * Transforms strings into URL-friendly slugs.
 *
 * This pipe converts any string into a lowercase, hyphenated slug format suitable
 * for URLs and route paths. It removes leading/trailing non-alphanumeric characters
 * and replaces internal sequences of non-alphanumeric characters with hyphens.
 *
 * @example
 * // In template
 * {{ 'My Component Name' | slug }}  // Output: 'my-component-name'
 * {{ 'Hello World!' | slug }}       // Output: 'hello-world'
 * {{ '  Test123  ' | slug }}        // Output: 'test123'
 */
@Injectable()
@Pipe({
  name: 'slug'
})
export class SlugPipe implements PipeTransform {
  /**
   * Transforms a string into a URL-friendly slug.
   * The transformation process:
   * 1. Converts the string to lowercase
   * 2. Removes leading and trailing non-alphanumeric characters
   * 3. Replaces sequences of non-alphanumeric characters with hyphens
   * @param value - The string to transform into a slug
   * @returns The slugified string in lowercase with hyphens separating words
   */
  transform(value: string): string {
    return value.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '').replace(/[^a-z0-9]+/gi, '-');
  }
}