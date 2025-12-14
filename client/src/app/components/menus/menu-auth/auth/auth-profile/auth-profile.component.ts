import { ChangeDetectionStrategy, Component, input, OnInit, output, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@app/services/auth.service';
import { UsernameService } from '@app/services/username.service';
import { getUserInitials } from '@app/helpers/user.helper';

/**
 * Profile view component for authenticated users.
 *
 * Features:
 * - User avatar with initials
 * - Email and username display
 * - Member since and last sign in timestamps
 * - View Profile button (navigates to /profile page)
 * - Logout button
 */
@Component({
  selector: 'app-auth-profile',
  templateUrl: './auth-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ButtonModule,
    MessageModule,
    DatePipe,
  ],
})
export class AuthProfileComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly usernameService = inject(UsernameService);

  // Input for auto-close timer (0 = no timer)
  readonly autoCloseSeconds = input<number>(0);

  // Output events for parent component
  readonly profileClick = output<void>();
  readonly logoutClick = output<void>();

  /**
   * Load username if not already loaded (e.g., on page refresh with existing session).
   */
  ngOnInit(): void {
    if (this.authService.isAuthenticated() && this.usernameService.username() === null) {
      this.usernameService.loadUsername();
    }
  }

  /**
   * Handle view profile button click
   */
  onViewProfile(): void {
    this.profileClick.emit();
  }

  /**
   * Get user initials for avatar display.
   * Uses first letter of email.
   */
  getUserInitials(): string {
    return getUserInitials(this.authService.currentUser());
  }

  /**
   * Handle logout button click
   */
  onLogout(): void {
    this.logoutClick.emit();
  }
}
