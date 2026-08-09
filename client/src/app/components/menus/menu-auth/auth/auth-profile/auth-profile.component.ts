import { ChangeDetectionStrategy, Component, input, OnInit, output, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '@app/services/auth.service';
import { UsernameService } from '@app/services/username.service';
import { getUserInitials } from '@app/helpers/user.helper';
import { RelativeTimeComponent } from '@app/components/ui/relative-time/relative-time.component';
import { TimerIndicatorDirective } from '@app/directives/timer-indicator.directive';

/**
 * Profile view component for the auth menu.
 *
 * Authenticated: avatar with initials, email and username, member-since and
 * last-sign-in timestamps, and a Log out button.
 * Anonymous: the same layout with a "Not logged in" row and a Log in button
 * (which swaps the menu over to the login form).
 * Either way the info row navigates to the /profile page.
 */
@Component({
  selector: 'app-auth-profile',
  templateUrl: './auth-profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ButtonModule,
    MessageModule,
    RelativeTimeComponent,
    TimerIndicatorDirective,
  ],
})
export class AuthProfileComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly usernameService = inject(UsernameService);

  // Input for auto-close timer (0 = no timer)
  readonly autoCloseSeconds = input<number>(0);

  // Output events for parent component
  readonly profileClick = output<void>();
  readonly loginClick = output<void>();
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
   * Get user initials for avatar display. Uses the chosen username when
   * available, falling back to the email's first character.
   */
  getUserInitials(): string {
    return getUserInitials(
      this.authService.currentUser(),
      this.usernameService.username()?.username,
    );
  }

  /**
   * Handle login button click (anonymous variant)
   */
  onLogin(): void {
    this.loginClick.emit();
  }

  /**
   * Handle logout button click
   */
  onLogout(): void {
    this.logoutClick.emit();
  }
}
