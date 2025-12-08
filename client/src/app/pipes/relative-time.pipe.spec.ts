import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { RelativeTimePipe } from './relative-time.pipe';

describe('RelativeTimePipe', () => {
  let pipe: RelativeTimePipe;
  let translocoService: jasmine.SpyObj<TranslocoService>;

  beforeEach(() => {
    translocoService = jasmine.createSpyObj('TranslocoService', ['translate']);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    translocoService.translate.and.callFake(((key: string, params?: Record<string, unknown>) => {
      if (key === 'time.Just now') return 'Just now';
      if (key === 'time.{count}m ago') return `${params?.['count']}m ago`;
      if (key === 'time.{count}h ago') return `${params?.['count']}h ago`;
      if (key === 'time.{count}d ago') return `${params?.['count']}d ago`;
      if (key === 'time.{count}w ago') return `${params?.['count']}w ago`;
      if (key === 'time.{count}mo ago') return `${params?.['count']}mo ago`;
      if (key === 'time.{count}y ago') return `${params?.['count']}y ago`;
      return key;
    }) as typeof translocoService.translate);

    TestBed.configureTestingModule({
      providers: [
        RelativeTimePipe,
        { provide: TranslocoService, useValue: translocoService },
      ],
    });

    pipe = TestBed.inject(RelativeTimePipe);
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should return "Just now" for times less than 1 minute ago', () => {
    const now = new Date();
    expect(pipe.transform(now)).toBe('Just now');
  });

  it('should return "Just now" for times 30 seconds ago', () => {
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    expect(pipe.transform(thirtySecondsAgo)).toBe('Just now');
  });

  it('should return minutes for times 1-59 minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(pipe.transform(fiveMinutesAgo)).toBe('5m ago');
  });

  it('should return hours for times 1-23 hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(pipe.transform(threeHoursAgo)).toBe('3h ago');
  });

  it('should return days for times 1-6 days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(twoDaysAgo)).toBe('2d ago');
  });

  it('should return weeks for times 7-29 days ago', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(twoWeeksAgo)).toBe('2w ago');
  });

  it('should return months for times 30-364 days ago', () => {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(threeMonthsAgo)).toBe('3mo ago');
  });

  it('should return years for times 365+ days ago', () => {
    const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(twoYearsAgo)).toBe('2y ago');
  });

  it('should handle Date objects', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    expect(pipe.transform(oneHourAgo)).toBe('1h ago');
  });

  it('should handle timestamp numbers', () => {
    const oneHourAgoTimestamp = Date.now() - 60 * 60 * 1000;
    expect(pipe.transform(oneHourAgoTimestamp)).toBe('1h ago');
  });

  it('should handle ISO date strings', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(pipe.transform(oneHourAgo)).toBe('1h ago');
  });

  it('should return "Just now" for future dates', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    expect(pipe.transform(future)).toBe('Just now');
  });

  it('should call translate with correct params for days', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    pipe.transform(twoDaysAgo);
    expect(translocoService.translate).toHaveBeenCalledWith('time.{count}d ago', { count: 2 });
  });

  it('should call translate with correct params for hours', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    pipe.transform(threeHoursAgo);
    expect(translocoService.translate).toHaveBeenCalledWith('time.{count}h ago', { count: 3 });
  });

  it('should call translate with correct params for minutes', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    pipe.transform(tenMinutesAgo);
    expect(translocoService.translate).toHaveBeenCalledWith('time.{count}m ago', { count: 10 });
  });
});
