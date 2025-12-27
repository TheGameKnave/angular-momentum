import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { TIME_CONSTANTS } from '@app/constants/ui.constants';

/** Time unit configuration for relative time formatting */
interface TimeUnit {
  value: number;
  pastKey: string;
  futureKey: string;
  threshold: number;
}

/**
 * Transforms a date into a human-readable relative time string.
 *
 * Uses transloco for i18n support with the following translation keys:
 * Past times:
 * - `time.Just now` - for times less than 1 minute ago
 * - `time.minutes ago` - for minutes
 * - `time.hours ago` - for hours
 * - `time.days ago` - for days
 * - `time.weeks ago` - for weeks
 * - `time.months ago` - for months
 * - `time.years ago` - for years
 *
 * Future times:
 * - `time.Momentarily` - for times less than 1 minute from now
 * - `time.in minutes` - for minutes from now
 * - `time.in hours` - for hours from now
 * - `time.in days` - for days from now
 * - `time.in weeks` - for weeks from now
 * - `time.in months` - for months from now
 * - `time.in years` - for years from now
 *
 * @example
 * ```html
 * {{ notification.timestamp | relativeTime }}
 * <!-- Output: "5 minutes ago" or "Just now" or "in 3 days" -->
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
    const absDiff = Math.abs(diff);
    const isFuture = diff < 0;

    const seconds = Math.floor(absDiff / TIME_CONSTANTS.SECONDS);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    // Time units ordered from largest to smallest
    const units: TimeUnit[] = [
      { value: years, pastKey: 'time.years ago', futureKey: 'time.in years', threshold: 1 },
      { value: months, pastKey: 'time.months ago', futureKey: 'time.in months', threshold: 1 },
      { value: weeks, pastKey: 'time.weeks ago', futureKey: 'time.in weeks', threshold: 1 },
      { value: days, pastKey: 'time.days ago', futureKey: 'time.in days', threshold: 1 },
      { value: hours, pastKey: 'time.hours ago', futureKey: 'time.in hours', threshold: 1 },
      { value: minutes, pastKey: 'time.minutes ago', futureKey: 'time.in minutes', threshold: 0 },
    ];

    for (const unit of units) {
      if (unit.value > unit.threshold) {
        const key = isFuture ? unit.futureKey : unit.pastKey;
        return this.translocoService.translate(key, { count: unit.value });
      }
    }

    // Less than 1 minute
    return this.translocoService.translate(isFuture ? 'time.Momentarily' : 'time.Just now');
  }
}
