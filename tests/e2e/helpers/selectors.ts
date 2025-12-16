// ============================================================================
// MENUS
// ============================================================================

export const menus = {
  // Auth menu
  authMenuButton: 'app-menu-auth .auth-menu-button',
  authMenuContent: '.anchor-menu-panel',

  // Language menu (in footer)
  languageMenuButton: 'app-menu-language',
  languageMenuContent: '.anchor-menu-panel',
  languageOption: (lang: string) => `.anchor-menu-panel .i18n-${lang} a`,

  // Feature sidebar (navigation, not a menu)
  featureSidebar: 'app-menu-feature',
  featureLink: (name: string) => `app-menu-feature a[href*="${name}"]`,

  // Changelog menu (version number in footer)
  changelogMenuButton: 'app-menu-change-log .change-log-button',
  changelogMenuContent: '.anchor-menu-panel',

  // Notification center
  notificationCenterButton: 'app-notification-center .anchor-menu-trigger',
  notificationCenterContent: '.anchor-menu-panel',
  notificationBadge: 'app-notification-center .notification-badge',
  notificationMarkAllRead: '.anchor-menu-panel button:has-text(/mark all read/i)',
  notificationClearAll: '.anchor-menu-panel button:has-text(/clear all/i)',
  notificationList: '.anchor-menu-panel .notification-list',
  notificationItem: '.anchor-menu-panel .notification-item',
  notificationEmpty: '.anchor-menu-panel .notification-empty',
};

// ============================================================================
// AUTH FORMS
// ============================================================================

export const auth = {
  // Tabs - using nth-child since Sign Up is first tab, Log in is second
  signupTab: '.auth-tabs button.auth-tab:first-child',
  loginTab: '.auth-tabs button.auth-tab:nth-child(2)',

  // Login form (formControlName="email" is used for email/username combo field)
  loginForm: 'app-auth-login',
  loginIdentifier: 'app-auth-login input[formControlName="email"]',
  loginPassword: 'app-auth-login input[formControlName="password"]',
  loginSubmit: 'app-auth-login button[type="submit"]',
  loginForgotPassword: 'app-auth-login .forgot-password button',

  // Signup form
  signupForm: 'app-auth-signup',
  signupEmail: 'app-auth-signup input[formControlName="email"]',
  signupUsername: 'app-auth-signup input[formControlName="username"]',
  signupPassword: 'app-auth-signup input[formControlName="password"]',
  signupConfirmPassword: 'app-auth-signup input[formControlName="confirmPassword"]',
  signupAgeCheckbox: 'app-auth-signup p-checkbox[formControlName="ageVerified"]',
  signupPrivacyCheckbox: 'app-auth-signup p-checkbox[formControlName="privacyAccepted"]',
  signupSubmit: 'app-auth-signup button[type="submit"]',

  // OTP form
  otpForm: 'app-auth-otp',
  otpInput: 'app-auth-otp input',

  // Reset form
  resetForm: 'app-auth-reset',
  resetEmail: 'app-auth-reset input[formControlName="email"]',
  resetSubmit: 'app-auth-reset button[type="submit"]',

  // Profile (when logged in)
  profileMenu: 'app-auth-profile',
  profileViewButton: 'app-auth-profile .profile-info',
  // Logout button is in the menu panel, not the trigger component
  logoutButton: '.anchor-menu-panel p-button',
};

// ============================================================================
// PAGES
// ============================================================================

export const pages = {
  // Features page
  featuresPage: 'app-features',
  featureList: 'app-features .feature-list',
  featureToggle: 'app-features .feature-list li p-toggleswitch',
  featureToggleInput: 'app-features .feature-list li p-toggleswitch input',

  // Profile page
  profilePage: 'app-profile',
  profileEmail: 'app-profile input[type="email"]',
  profileTimezone: 'app-profile p-select',
  profileExportButton: 'app-profile p-button:has-text("Export Data")',
  profileDeleteDataButton: 'app-profile p-button:has-text("Clear Data")',
  profileDeleteAccountButton: 'app-profile p-button:has-text("Delete Account")',

  // Notifications page
  notificationsPage: 'app-notifications',
  notificationTemplates: 'app-notifications p-card',
  sendLocalButton: 'app-notifications p-button:has-text("Send Local")',
  sendBroadcastButton: 'app-notifications p-button:has-text("Broadcast")',

  // IndexedDB page
  indexedDbPage: 'app-indexeddb',
  indexedDbTextarea: 'app-indexeddb textarea',

  // GraphQL API page
  graphqlPage: 'app-graphql-api',

  // Privacy page
  privacyPage: 'app-privacy-policy',

  // Landing/Index page
  landingPage: 'app-index',
};

// ============================================================================
// COMMON ELEMENTS
// ============================================================================

export const common = {
  // Navigation
  homeLink: '.link-home',

  // Toast messages
  toast: 'p-toast',
  toastMessage: 'p-toast .p-toast-message',
  toastSuccess: 'p-toast .p-toast-message-success',
  toastError: 'p-toast .p-toast-message-error',

  // Dialogs
  confirmDialog: 'p-confirmdialog',
  confirmDialogAccept: 'p-confirmdialog button:has-text(/yes|ok|confirm/i)',
  confirmDialogReject: 'p-confirmdialog button:has-text(/no|cancel/i)',

  // Loading states
  spinner: 'p-progressspinner',

  // Errors
  errorMessage: '.error-message, .p-error, [class*="error"]',

  // Storage promotion dialog (uses p-dialog with "Import Local Data" title)
  storagePromotionDialog: 'p-dialog:has-text("Import Local Data")',
  storagePromotionImport: 'p-dialog button:has-text(/import/i)',
  storagePromotionSkip: 'p-dialog button:has-text(/skip/i)',

  // Cookie consent banner
  cookieBanner: 'app-cookie-banner .cookie-banner',
  cookieAccept: 'app-cookie-banner p-button:has-text("Accept")',
  cookieDecline: 'app-cookie-banner p-button:has-text("Decline")',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Gets a feature toggle by its name/label.
 */
export function getFeatureToggleByName(name: string): string {
  return `app-features .feature-list li:has(label:has-text("${name}")) p-toggleswitch`;
}

/**
 * Gets a language option by language code.
 */
export function getLanguageOption(langCode: string): string {
  return `.anchor-menu-panel .i18n-${langCode} a`;
}
