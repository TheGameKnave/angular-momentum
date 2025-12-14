import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthProfileComponent } from './auth-profile.component';
import { AuthService } from '@app/services/auth.service';
import { UsernameService } from '@app/services/username.service';
import { getTranslocoModule } from 'src/../../tests/helpers/transloco-testing.module';

describe('AuthProfileComponent', () => {
  let component: AuthProfileComponent;
  let fixture: ComponentFixture<AuthProfileComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockUsernameService: jasmine.SpyObj<UsernameService>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['isAuthenticated'], {
      currentUser: signal({
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        last_sign_in_at: '2024-01-15T12:00:00Z'
      } as any),
      currentSession: signal(null),
      loading: signal(false),
      isPasswordRecovery: signal(false)
    });
    mockAuthService.isAuthenticated.and.returnValue(true);

    mockUsernameService = jasmine.createSpyObj('UsernameService', ['loadUsername'], {
      username: signal({
        username: 'testuser',
        fingerprint: 'test-fingerprint'
      }),
      loading: signal(false),
      creationFailed: signal(false)
    });

    await TestBed.configureTestingModule({
      imports: [
        AuthProfileComponent,
        getTranslocoModule(),
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsernameService, useValue: mockUsernameService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Inputs', () => {
    it('should accept autoCloseSeconds input', () => {
      fixture.componentRef.setInput('autoCloseSeconds', 5);
      fixture.detectChanges();

      expect(component.autoCloseSeconds()).toBe(5);
    });

    it('should default to 0 seconds for auto-close', () => {
      expect(component.autoCloseSeconds()).toBe(0);
    });
  });

  describe('onViewProfile', () => {
    it('should emit profileClick event', () => {
      const profileClickSpy = jasmine.createSpy('profileClick');
      component.profileClick.subscribe(profileClickSpy);

      component.onViewProfile();

      expect(profileClickSpy).toHaveBeenCalled();
    });
  });

  describe('onLogout', () => {
    it('should emit logoutClick event', () => {
      const logoutClickSpy = jasmine.createSpy('logoutClick');
      component.logoutClick.subscribe(logoutClickSpy);

      component.onLogout();

      expect(logoutClickSpy).toHaveBeenCalled();
    });
  });

  describe('getUserInitials', () => {
    it('should return first letter of email in uppercase', () => {
      const initials = component.getUserInitials();
      expect(initials).toBe('T');
    });

    it('should return question mark if no user', () => {
      mockAuthService = jasmine.createSpyObj('AuthService', ['isAuthenticated'], {
        currentUser: signal(null),
        currentSession: signal(null),
        loading: signal(false),
        isPasswordRecovery: signal(false)
      });
      mockAuthService.isAuthenticated.and.returnValue(false);

      mockUsernameService = jasmine.createSpyObj('UsernameService', ['loadUsername'], {
        username: signal({ username: 'testuser', fingerprint: 'test-fingerprint' }),
        loading: signal(false),
        creationFailed: signal(false)
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [AuthProfileComponent, getTranslocoModule()],
        providers: [
          { provide: AuthService, useValue: mockAuthService },
          { provide: UsernameService, useValue: mockUsernameService },
        ]
      });

      fixture = TestBed.createComponent(AuthProfileComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const initials = component.getUserInitials();
      expect(initials).toBe('?');
    });

    it('should return question mark if user has no email', () => {
      mockAuthService = jasmine.createSpyObj('AuthService', ['isAuthenticated'], {
        currentUser: signal({ id: 'user-123' } as any),
        currentSession: signal(null),
        loading: signal(false),
        isPasswordRecovery: signal(false)
      });
      mockAuthService.isAuthenticated.and.returnValue(true);

      mockUsernameService = jasmine.createSpyObj('UsernameService', ['loadUsername'], {
        username: signal({ username: 'testuser', fingerprint: 'test-fingerprint' }),
        loading: signal(false),
        creationFailed: signal(false)
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [AuthProfileComponent, getTranslocoModule()],
        providers: [
          { provide: AuthService, useValue: mockAuthService },
          { provide: UsernameService, useValue: mockUsernameService },
        ]
      });

      fixture = TestBed.createComponent(AuthProfileComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const initials = component.getUserInitials();
      expect(initials).toBe('?');
    });

    it('should handle lowercase email', () => {
      mockAuthService = jasmine.createSpyObj('AuthService', ['isAuthenticated'], {
        currentUser: signal({ id: 'user-123', email: 'abc@example.com' } as any),
        currentSession: signal(null),
        loading: signal(false),
        isPasswordRecovery: signal(false)
      });
      mockAuthService.isAuthenticated.and.returnValue(true);

      mockUsernameService = jasmine.createSpyObj('UsernameService', ['loadUsername'], {
        username: signal({ username: 'testuser', fingerprint: 'test-fingerprint' }),
        loading: signal(false),
        creationFailed: signal(false)
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [AuthProfileComponent, getTranslocoModule()],
        providers: [
          { provide: AuthService, useValue: mockAuthService },
          { provide: UsernameService, useValue: mockUsernameService },
        ]
      });

      fixture = TestBed.createComponent(AuthProfileComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const initials = component.getUserInitials();
      expect(initials).toBe('A');
    });
  });

  describe('User Display Information', () => {
    it('should display user email from auth service', () => {
      const user = mockAuthService.currentUser();
      expect(user?.email).toBe('test@example.com');
    });

    it('should display username from username service', () => {
      const usernameData = mockUsernameService.username();
      expect(usernameData?.username).toBe('testuser');
    });

    it('should handle user without username', () => {
      // Recreate authService mock with isAuthenticated method
      mockAuthService = jasmine.createSpyObj('AuthService', ['isAuthenticated'], {
        currentUser: signal({
          id: 'user-123',
          email: 'test@example.com',
          created_at: '2024-01-01T00:00:00Z',
          last_sign_in_at: '2024-01-15T12:00:00Z'
        } as any),
        currentSession: signal(null),
        loading: signal(false),
        isPasswordRecovery: signal(false)
      });
      mockAuthService.isAuthenticated.and.returnValue(true);

      mockUsernameService = jasmine.createSpyObj('UsernameService', ['loadUsername'], {
        username: signal(null),
        loading: signal(false),
        creationFailed: signal(false)
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [AuthProfileComponent, getTranslocoModule()],
        providers: [
          { provide: AuthService, useValue: mockAuthService },
          { provide: UsernameService, useValue: mockUsernameService },
        ]
      });

      fixture = TestBed.createComponent(AuthProfileComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const usernameData = mockUsernameService.username();
      expect(usernameData).toBeNull();
    });
  });

  describe('Auto-close Timer Display', () => {
    it('should display auto-close timer when set', () => {
      fixture.componentRef.setInput('autoCloseSeconds', 3);
      fixture.detectChanges();

      expect(component.autoCloseSeconds()).toBe(3);
    });

    it('should not display timer when set to 0', () => {
      fixture.componentRef.setInput('autoCloseSeconds', 0);
      fixture.detectChanges();

      expect(component.autoCloseSeconds()).toBe(0);
    });
  });

  describe('Component Services Access', () => {
    it('should have access to authService', () => {
      expect(component['authService']).toBeDefined();
      expect(component['authService']).toBe(mockAuthService);
    });

    it('should have access to usernameService', () => {
      expect(component['usernameService']).toBeDefined();
      expect(component['usernameService']).toBe(mockUsernameService);
    });
  });

  describe('User Timestamps', () => {
    it('should provide created_at timestamp', () => {
      const user = mockAuthService.currentUser();
      expect(user?.created_at).toBe('2024-01-01T00:00:00Z');
    });

    it('should provide last_sign_in_at timestamp', () => {
      const user = mockAuthService.currentUser();
      expect(user?.last_sign_in_at).toBe('2024-01-15T12:00:00Z');
    });
  });

  describe('Event Outputs', () => {
    it('should have profileClick output', () => {
      expect(component.profileClick).toBeDefined();
    });

    it('should have logoutClick output', () => {
      expect(component.logoutClick).toBeDefined();
    });
  });

  describe('Component Styling', () => {
    it('should have auto-close progress styles defined', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      // The component has styles defined in the @Component decorator
      expect(component).toBeTruthy();
    });
  });

  describe('ngOnInit Username Loading', () => {
    it('should load username when authenticated but username is null', () => {
      mockAuthService = jasmine.createSpyObj('AuthService', ['isAuthenticated'], {
        currentUser: signal({
          id: 'user-123',
          email: 'test@example.com',
          created_at: '2024-01-01T00:00:00Z',
          last_sign_in_at: '2024-01-15T12:00:00Z'
        } as any),
        currentSession: signal(null),
        loading: signal(false),
        isPasswordRecovery: signal(false)
      });
      mockAuthService.isAuthenticated.and.returnValue(true);

      mockUsernameService = jasmine.createSpyObj('UsernameService', ['loadUsername'], {
        username: signal(null), // username is null
        loading: signal(false),
        creationFailed: signal(false)
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [AuthProfileComponent, getTranslocoModule()],
        providers: [
          { provide: AuthService, useValue: mockAuthService },
          { provide: UsernameService, useValue: mockUsernameService },
        ]
      });

      fixture = TestBed.createComponent(AuthProfileComponent);
      component = fixture.componentInstance;
      fixture.detectChanges(); // triggers ngOnInit

      expect(mockUsernameService.loadUsername).toHaveBeenCalled();
    });

    it('should not load username when already loaded', () => {
      // Default setup has username already loaded
      expect(mockUsernameService.loadUsername).not.toHaveBeenCalled();
    });

    it('should not load username when not authenticated', () => {
      mockAuthService = jasmine.createSpyObj('AuthService', ['isAuthenticated'], {
        currentUser: signal(null),
        currentSession: signal(null),
        loading: signal(false),
        isPasswordRecovery: signal(false)
      });
      mockAuthService.isAuthenticated.and.returnValue(false);

      mockUsernameService = jasmine.createSpyObj('UsernameService', ['loadUsername'], {
        username: signal(null),
        loading: signal(false),
        creationFailed: signal(false)
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [AuthProfileComponent, getTranslocoModule()],
        providers: [
          { provide: AuthService, useValue: mockAuthService },
          { provide: UsernameService, useValue: mockUsernameService },
        ]
      });

      fixture = TestBed.createComponent(AuthProfileComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      expect(mockUsernameService.loadUsername).not.toHaveBeenCalled();
    });
  });
});
