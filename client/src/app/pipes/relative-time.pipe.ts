import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { TIME_CONSTANTS } from '@app/constants/ui.constants';

/**
 * Transforms a date into a human-readable relative time string.
 *
 * Uses transloco for i18n support with the following translation keys:
 * - `time.Just now` - for times less than 1 minute ago
 * - `time.minutes ago` - for minutes
 * - `time.hours ago` - for hours
 * - `time.days ago` - for days
 * - `time.weeks ago` - for weeks
 * - `time.months ago` - for months
 * - `time.years ago` - for years
 *
 * @example
 * ```html
 * {{ notification.timestamp | relativeTime }}
 * <!-- Output: "5m ago" or "Just now" -->
 * ```
 */
@Pipe({
  name: 'relativeTime',
  pure: false, // Impure to update as time passes (use sparingly)
})
export class RelativeTimePipe implements PipeTransform {
  private readonly translocoService = inject(TranslocoService);

  /**
   * Transform a date into a relative time string.
   * @param value - Date object, timestamp number, or ISO date string
   * @returns Translated relative time string
   */
  transform(value: Date | number | string | null | undefined): string {
    if (value == null) {
      return '';
    }

    const now = new Date();
    const date = value instanceof Date ? value : new Date(value);
    const diff = now.getTime() - date.getTime();

    // Handle future dates
    if (diff < 0) {
      return this.translocoService.translate('time.Just now');
    }

    const seconds = Math.floor(diff / TIME_CONSTANTS.SECONDS);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 1) {
      return this.translocoService.translate('time.years ago', { count: years });
    }
    if (months > 1) {
      return this.translocoService.translate('time.months ago', { count: months });
    }
    if (weeks > 1) {
      return this.translocoService.translate('time.weeks ago', { count: weeks });
    }
    if (days > 1) {
      return this.translocoService.translate('time.days ago', { count: days });
    }
    if (hours > 1) {
      return this.translocoService.translate('time.hours ago', { count: hours });
    }
    if (minutes > 0) {
      return this.translocoService.translate('time.minutes ago', { count: minutes });
    }
    return this.translocoService.translate('time.Just now');
  }
}
