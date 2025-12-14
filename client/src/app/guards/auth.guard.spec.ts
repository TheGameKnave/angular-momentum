import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'setReturnUrl']);
    mockRouter = jasmine.createSpyObj('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    guard = TestBed.inject(AuthGuard);
    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = { url: '/profile' } as RouterStateSnapshot;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('canActivate', () => {
    it('should allow access when user is authenticated', () => {
      mockAuthService.isAuthenticated.and.returnValue(true);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(true);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
      expect(mockAuthService.setReturnUrl).not.toHaveBeenCalled();
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
    });

    it('should redirect to home and set return URL when user is not authenticated', () => {
      const mockUrlTree = {} as UrlTree;
      mockAuthService.isAuthenticated.and.returnValue(false);
      mockRouter.createUrlTree.and.returnValue(mockUrlTree);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(mockUrlTree);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
      expect(mockAuthService.setReturnUrl).toHaveBeenCalledWith('/profile');
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/']);
    });

    it('should set correct return URL from state', () => {
      const customState = { url: '/custom/path' } as RouterStateSnapshot;
      mockAuthService.isAuthenticated.and.returnValue(false);
      mockRouter.createUrlTree.and.returnValue({} as UrlTree);

      guard.canActivate(mockRoute, customState);

      expect(mockAuthService.setReturnUrl).toHaveBeenCalledWith('/custom/path');
    });
  });
});
