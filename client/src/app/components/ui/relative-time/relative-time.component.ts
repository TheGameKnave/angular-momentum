import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  OnChanges,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { TooltipModule } from 'primeng/tooltip';
import { RelativeTimePipe } from '@app/pipes/relative-time.pipe';
import { TIME_CONSTANTS, TOOLTIP_CONFIG } from '@app/constants/ui.constants';

/** Display mode for the time component */
export type TimeDisplayMode = 'relative' | 'absolute';

/** Format preset for absolute mode */
export type AbsoluteTimeFormat = 'short' | 'medium' | 'long' | 'shortDate' | 'shortTime';

/**
 * Component that displays time with a tooltip showing the full localized date/time.
 *
 * @example
 * ```html
 * <!-- Relative time (default): "5 minutes ago" -->
 * <app-relative-time [timestamp]="notification.timestamp" />
 *
 * <!-- Absolute time: "12/13/24, 9:41 PM" -->
 * <app-relative-time [timestamp]="user.lastLogin" mode="absolute" />
 *
 * <!-- Absolute date only: "12/13/24" -->
 * <app-relative-time [timestamp]="user.createdAt" mode="absolute" format="shortDate" />
 * ```
 *
 * The component:
 * - In 'relative' mode: displays relative time (e.g., "5 minutes ago"), updates every minute
 * - In 'absolute' mode: displays formatted date/time based on format preset
 * - Always shows a PrimeNG tooltip with the full localized date/time on hover
 */
@Component({
  selector: 'app-relative-time',
  standalone: true,
  imports: [TooltipModule],
  template: `
    <span
      [pTooltip]="tooltipContent()"
      tooltipPosition="top"
      [showDelay]="showDelay"
      [hideDelay]="hideDelay"
    >{{ displayText() }}</span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RelativeTimePipe],
})
export class RelativeTimeComponent implements OnInit, OnChanges, OnDestroy {
  private readonly translocoService = inject(TranslocoService);
  private readonly relativeTimePipe = inject(RelativeTimePipe);

  @Input({ required: true }) timestamp!: Date | number | string | null | undefined;
  @Input() mode: TimeDisplayMode = 'relative';
  @Input() format: AbsoluteTimeFormat = 'short';

  readonly displayText = signal<string>('');
  readonly tooltipContent = signal<string>('');
  readonly showDelay = TOOLTIP_CONFIG.SHOW_DELAY;
  readonly hideDelay = TOOLTIP_CONFIG.HIDE_DELAY;

  private intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize display and start timer if in relative mode.
   */
  ngOnInit(): void {
    this.update();
    // Only start timer in relative mode (absolute times don't change)
    if (this.mode === 'relative') {
      this.startTimer();
    }
  }

  /**
   * Update display when inputs change and manage timer based on mode.
   */
  ngOnChanges(): void {
    this.update();
    // Restart or stop timer based on mode change
    if (this.mode === 'relative') {
      this.startTimer();
    } else {
      this.stopTimer();
    }
  }

  /**
   * Clean up timer on component destruction.
   */
  ngOnDestroy(): void {
    this.stopTimer();
  }

  /**
   * Updates the display text and tooltip content based on current timestamp and mode.
   */
  private update(): void {
    if (this.timestamp == null) {
      this.displayText.set('');
      this.tooltipContent.set('');
      return;
    }

    const date = this.timestamp instanceof Date
      ? this.timestamp
      : new Date(this.timestamp);

    if (this.mode === 'relative') {
      this.displayText.set(this.relativeTimePipe.transform(date));
    } else {
      this.displayText.set(this.formatAbsolute(date));
    }
    this.tooltipContent.set(this.getLocalizedDateTime(date));
  }

  /**
   * Formats a date using the specified format preset.
   * @param date - The date to format
   * @returns Formatted date string
   */
  private formatAbsolute(date: Date): string {
    const locale = this.translocoService.getActiveLang();
    const options = this.getFormatOptions();
    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  /**
   * Gets Intl.DateTimeFormat options based on format preset.
   */
  private getFormatOptions(): Intl.DateTimeFormatOptions {
    switch (this.format) {
      case 'shortDate':
        return { dateStyle: 'short' };
      case 'shortTime':
        return { timeStyle: 'short' };
      case 'medium':
        return { dateStyle: 'medium', timeStyle: 'short' };
      case 'long':
        return { dateStyle: 'long', timeStyle: 'short' };
      case 'short':
      default:
        return { dateStyle: 'short', timeStyle: 'short' };
    }
  }

  /**
   * Gets the localized full date/time string for a timestamp.
   * @param date - The date to format
   * @returns Localized date/time string
   */
  private getLocalizedDateTime(date: Date): string {
    const locale = this.translocoService.getActiveLang();
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(date);
  }

  /**
   * Starts the periodic update timer for relative time display.
   */
  private startTimer(): void {
    this.stopTimer();
    // Update relative time and tooltip every minute
    this.intervalId = setInterval(() => this.update(), TIME_CONSTANTS.MINUTES);
  }

  /**
   * Stops the periodic update timer.
   */
  private stopTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
