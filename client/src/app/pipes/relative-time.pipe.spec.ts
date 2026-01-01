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
      // Past times
      if (key === 'time.Just now') return 'Just now';
      if (key === 'time.minutes ago') return `${params?.['count']}m ago`;
      if (key === 'time.hours ago') return `${params?.['count']}h ago`;
      if (key === 'time.days ago') return `${params?.['count']}d ago`;
      if (key === 'time.weeks ago') return `${params?.['count']}w ago`;
      if (key === 'time.months ago') return `${params?.['count']}mo ago`;
      if (key === 'time.years ago') return `${params?.['count']}y ago`;
      // Future times
      if (key === 'time.Momentarily') return 'Momentarily';
      if (key === 'time.in minutes') return `in ${params?.['count']}m`;
      if (key === 'time.in hours') return `in ${params?.['count']}h`;
      if (key === 'time.in days') return `in ${params?.['count']}d`;
      if (key === 'time.in weeks') return `in ${params?.['count']}w`;
      if (key === 'time.in months') return `in ${params?.['count']}mo`;
      if (key === 'time.in years') return `in ${params?.['count']}y`;
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

  it('should return hours for times 2+ hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(pipe.transform(threeHoursAgo)).toBe('3h ago');
  });

  it('should return minutes for 1 hour ago (more granular)', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    expect(pipe.transform(oneHourAgo)).toBe('60m ago');
  });

  it('should return days for times 2+ days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(twoDaysAgo)).toBe('2d ago');
  });

  it('should return hours for 1 day ago (more granular)', () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(pipe.transform(oneDayAgo)).toBe('24h ago');
  });

  it('should return weeks for times 2+ weeks ago', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(twoWeeksAgo)).toBe('2w ago');
  });

  it('should return days for 1 week ago (more granular)', () => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(oneWeekAgo)).toBe('7d ago');
  });

  it('should return months for times 2+ months ago', () => {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(threeMonthsAgo)).toBe('3mo ago');
  });

  it('should return weeks for 1 month ago (more granular)', () => {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(oneMonthAgo)).toBe('4w ago');
  });

  it('should return years for times 2+ years ago', () => {
    const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(twoYearsAgo)).toBe('2y ago');
  });

  it('should return months for 1 year ago (more granular)', () => {
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(oneYearAgo)).toBe('12mo ago');
  });

  it('should handle Date objects', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(pipe.transform(twoHoursAgo)).toBe('2h ago');
  });

  it('should handle timestamp numbers', () => {
    const twoHoursAgoTimestamp = Date.now() - 2 * 60 * 60 * 1000;
    expect(pipe.transform(twoHoursAgoTimestamp)).toBe('2h ago');
  });

  it('should handle ISO date strings', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(pipe.transform(twoHoursAgo)).toBe('2h ago');
  });

  describe('future dates', () => {
    it('should return "Momentarily" for times less than 1 minute in the future', () => {
      const thirtySecondsFromNow = new Date(Date.now() + 30 * 1000);
      expect(pipe.transform(thirtySecondsFromNow)).toBe('Momentarily');
    });

    it('should return minutes for times 1-59 minutes in the future', () => {
      // Add 30s buffer to avoid flaky test when Date.now() shifts between setup and assertion
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000 + 30 * 1000);
      expect(pipe.transform(fiveMinutesFromNow)).toBe('in 5m');
    });

    it('should return hours for times 2+ hours in the future', () => {
      // Add 30s buffer to avoid flaky test when Date.now() shifts between setup and assertion
      const threeHoursFromNow = new Date(Date.now() + 3 * 60 * 60 * 1000 + 30 * 1000);
      expect(pipe.transform(threeHoursFromNow)).toBe('in 3h');
    });

    it('should return days for times 2+ days in the future', () => {
      const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      expect(pipe.transform(twoDaysFromNow)).toBe('in 2d');
    });

    it('should return weeks for times 2+ weeks in the future', () => {
      // 18 days = solidly in "2 weeks" range (14-21 days)
      const twoWeeksFromNow = new Date(Date.now() + 18 * 24 * 60 * 60 * 1000);
      expect(pipe.transform(twoWeeksFromNow)).toBe('in 2w');
    });

    it('should return months for times 2+ months in the future', () => {
      // 105 days = solidly in "3 months" range (~3.5 months)
      const threeMonthsFromNow = new Date(Date.now() + 105 * 24 * 60 * 60 * 1000);
      expect(pipe.transform(threeMonthsFromNow)).toBe('in 3mo');
    });

    it('should return years for times 2+ years in the future', () => {
      // 900 days = solidly in "2 years" range (~2.5 years)
      const twoYearsFromNow = new Date(Date.now() + 900 * 24 * 60 * 60 * 1000);
      expect(pipe.transform(twoYearsFromNow)).toBe('in 2y');
    });

    it('should call translate with correct params for future days', () => {
      const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      pipe.transform(twoDaysFromNow);
      expect(translocoService.translate).toHaveBeenCalledWith('time.in days', { count: 2 });
    });

    it('should call translate with correct params for future minutes', () => {
      const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000);
      pipe.transform(tenMinutesFromNow);
      expect(translocoService.translate).toHaveBeenCalledWith('time.in minutes', { count: 10 });
    });
  });

  it('should call translate with correct params for days', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    pipe.transform(twoDaysAgo);
    expect(translocoService.translate).toHaveBeenCalledWith('time.days ago', { count: 2 });
  });

  it('should call translate with correct params for hours', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    pipe.transform(twoHoursAgo);
    expect(translocoService.translate).toHaveBeenCalledWith('time.hours ago', { count: 2 });
  });

  it('should call translate with correct params for minutes', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    pipe.transform(tenMinutesAgo);
    expect(translocoService.translate).toHaveBeenCalledWith('time.minutes ago', { count: 10 });
  });
});
