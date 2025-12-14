import { TestBed } from '@angular/core/testing';
import { provideFeatureMonitor } from './feature-monitor.provider';
import { FeatureMonitorService } from '@app/services/feature-monitor.service';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HelpersService } from '@app/services/helpers.service';
import { FeatureFlagService } from '@app/services/feature-flag.service';
import { SlugPipe } from '@app/pipes/slug.pipe';
import { SocketIoConfig, SocketIoModule } from 'ngx-socket-io';

describe('provideFeatureMonitor', () => {
  it('should initialize FeatureMonitorService at app startup', () => {
    const mockSocketConfig: SocketIoConfig = { url: 'http://localhost', options: {} };

    TestBed.configureTestingModule({
      imports: [SocketIoModule.forRoot(mockSocketConfig)],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideFeatureMonitor(),
        HelpersService,
        FeatureFlagService,
        SlugPipe,
      ],
    });

    const service = TestBed.inject(FeatureMonitorService);
    expect(service).toBeTruthy();
  });
});
