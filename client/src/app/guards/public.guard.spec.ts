import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { PublicGuard } from './public.guard';
import { AuthService } from '../services/auth.service';

describe('PublicGuard', () => {
  let guard: PublicGuard;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['isAuthenticated']);
    mockRouter = jasmine.createSpyObj('Router', ['createUrlTree']);

    TestBed.configureTestingModule({
      providers: [
        PublicGuard,
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    guard = TestBed.inject(PublicGuard);
    mockRoute = { queryParams: {} } as ActivatedRouteSnapshot;
    mockState = { url: '/login' } as RouterStateSnapshot;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('canActivate', () => {
    it('should allow access when user is not authenticated', () => {
      mockAuthService.isAuthenticated.and.returnValue(false);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(true);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
      expect(mockRouter.createUrlTree).not.toHaveBeenCalled();
    });

    it('should redirect to /profile when user is authenticated and no returnUrl', () => {
      const mockUrlTree = {} as UrlTree;
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockRouter.createUrlTree.and.returnValue(mockUrlTree);

      const result = guard.canActivate(mockRoute, mockState);

      expect(result).toBe(mockUrlTree);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/profile']);
    });

    it('should redirect to returnUrl when user is authenticated and returnUrl is provided', () => {
      const mockUrlTree = {} as UrlTree;
      const routeWithReturnUrl = { queryParams: { returnUrl: '/dashboard' } } as unknown as ActivatedRouteSnapshot;
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockRouter.createUrlTree.and.returnValue(mockUrlTree);

      const result = guard.canActivate(routeWithReturnUrl, mockState);

      expect(result).toBe(mockUrlTree);
      expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should handle empty returnUrl and redirect to /profile', () => {
      const mockUrlTree = {} as UrlTree;
      const routeWithEmptyReturnUrl = { queryParams: { returnUrl: '' } } as unknown as ActivatedRouteSnapshot;
      mockAuthService.isAuthenticated.and.returnValue(true);
      mockRouter.createUrlTree.and.returnValue(mockUrlTree);

      const result = guard.canActivate(routeWithEmptyReturnUrl, mockState);

      expect(result).toBe(mockUrlTree);
      expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/profile']);
    });
  });
});
