# angular-momentum

This repo is intended to allow spooling up Angular projects in a monorepo rapidly, with a minimum of configuration.

## Current features
* Angular 20 (with Node 22.14)
* Parallel server/client execution
* Bare-bones api proxy to the back-end *
* SASS boilerplate included
* Frontend environment detection *
* Auto-unsub from subscriptions
* Heroku deployment
* Google Analytics
* Service worker to persist app and manage versions *
* Hot module replacement for faster dev iteration
* Typescript with node for back-end
* Client & Server unit testing via jasmine
* Benchmark memory usage and response times (throttled for mobile) in tests
* Internationalization (i18n) with Transloco
* IndexedDB for offline storage *
* Documentation enforced via husky
* e2e testing with TestCafe + snapshots
* 100% coverage in unit tests (jasmine for client and jest for server)
* Feature flags *
* CI/CD (github actions, sonar)
* Hotjar script for user behavior analysis
* Websockets to reconcile disparities between server and local data *
* public api with GraphQL *
* DB-agnostic query layer
* Network connectivity detection *
* CDN for static assets and binary distros
* Tauri app signing and (desktop) auto-updating for distribution to Android, iOS, macOS, Windows, and Linux.
* Automatic platform deploys via Github Actions
* Push notifications (WebSocket-based) for Web, PWA, and all Tauri platforms *

(* indicates a feature that’s visible in the sample app)

## Future features
* Server-side rendering
* Supabase(?) user management (emails and password resetting and deliverability) *
* timezone detection AND user-setting
* Angular 21, Vitest, Zoneless
* Lighthouse CI to mitigate performance slip

## License
This project is licensed under the MIT License (see [LICENSE](https://github.com/TheGameKnave/angular-momentum/blob/main/LICENSE) file for details).

### Using This as a Base for Your Own App?
- If you modify and distribute this **library itself**, you must keep it MIT-licensed.
- If you use this library as a foundation to build **your own application**, you can license your application however you choose.

## Quick start

### Node

Install node `22.14.0` Recommended to install NVM to manage node versions.

Install NPM 10.8.1 (should be bundled with node).

### Angular cli

Install Angular CLI to allow executing commands: `npm i -g @angular/cli`

### Install modules

From the root, run `npm ci`

### Environment variables

Create your `.env` file from the `.env.example` **and** ***never*** **commit sensitive information like API keys or passwords or usernames or email addresses**


### git branches

Develop against branches from `dev` feature branch using prefix `feature/` or `defect/`. `main` is for production releases, `staging` is to test prod.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the front- and back-end concurrently. See above.  
**This is the preferred method of running a local**

### `npm run client`

Runs only the front-end of the app (on port 4200) in development mode.  
Open [http://localhost:4200](http://localhost:4200) to view it in the browser.

The page will reload if you make edits.

### `npm run server`

Runs only the back-end of the app (on port 4201) in development mode.  
Open [http://localhost:4201/api](http://localhost:4201/api) to view it in the browser.

This will display the API responses.

## Tests

* from root, run `npm test` for full test suite, below (best to ensure green 100% coverage before any PRs to `dev`)

### Translation Testing

* from root, run `npm run test-translation` to uncover any gaps in translation files, relative to schema (will not detect completely missing schema keys; refer to browser errors for that)

### Unit Testing

* from root, run `npm run test-server` and `npm run test-client` to execute each unit test suite independently

### TestCafe end-to-end testing

* from root, run `npm run test-e2e`
Runs e2e tests and takes new "tested" screenshots.

#### Visual regression testing in Testcafe via testcafe-blink-diff
Run the Testcafe command with more parameters, since with this one we're taking screenshots and prepping to compare them.

* from root, run `npm run accept <directory>`
Accept all screenshot diffs and overwrite accepted comparisons. Optional argument is a directory to traverse, for targeting specific test cases.

* from `tests/e2e`, run `node test_runner accepted`
Runs e2e tests and takes the base screenshots if they don't exist. (will overwrite existing screenshots)

* from `tests/e2e`, run `npx testcafe-blink-diff tests/e2e/screenshots --compare accepted:tested --open --threshold 0.005`
The CLI command to compare accepted:tested screenshots for differences. If a test case's screenshots have not been created, this will fail when looking for the "accepted.png"
The report will be in generated/index.html.

### SonarQube code hygeine testing

Install Docker from website (not homebrew).

from `tests`, create docker instance with `docker run -d --name sonarqube -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true -p 9000:9000 sonarqube:latest`

Navigate to [SonarQube Server](http://localhost:9000) instance

* Log in to your SonarQube server as an administrator.
* Go to the Security page (usually located in the top-right corner of the page).
* Click on My Account.
* Scroll down to the Security section.
* Click on Generate Tokens.
* Enter a name for the token (e.g., "My Token").
* Click Generate.
* add token to .env file

Download SonarScanner and run from project root: `npm run sonar`

## Deployment

### Install Heroku CLI

* mac (requires homebrew): `brew tap heroku/brew && brew install heroku`
* linux: `sudo snap install --classic heroku`

### Add Heroku to Git

`heroku git:remote -a <APP_NAME>-dev`
`git remote rename heroku heroku-dev`  
`heroku git:remote -a <APP_NAME>-staging`  
`git remote rename heroku heroku-staging`  
`heroku git:remote -a <APP_NAME>`  
`git remote rename heroku heroku-production`

### Deploy

From root:  
`npm run deploy:dev`  
`npm run deploy:staging`  
`npm run deploy:production`

## Tauri

This repo utilizes Tauri to publish native apps for Windows, MacOS, Linux, Android, and iOS. Some of the scripts are fairly straightforward, but all require external dependencies: at the very least, Rust; and likely xCode and/or Android Studio. For more information, see the [Tauri documentation](https://tauri.app/). It's best to spin up a completely blank repo and follow the instructions on the Tauri website along with generous usage of ChatGPT to get your external tools running.

After your pipeline is configured, the following scripts are useful.

from `client`, while running a server locally:
* `npm run tauri:dev` to dev-build and deploy to local machine.
* `npm run tauri:android` to dev-build and deploy to Android simulator.
* `npm run tauri:ios` to dev-build and deploy to iOS simulator.

from `client`, while remote server is running:
* `npm run tauri build` to build a standalone dev release for Windows, MacOS, and Linux.
* `npm run tauri android dev` to build a standalone dev release for Android. (set `tauri.conf.json` devUrl to `https://angularmomentum.app`) to enable live server features.
* `npm run tauri ios build -- --export-method app-store-connect` to build a release for iOS.

### Tauri configuration

Tauri desktop builds can have update tar.gz files that can be downloaded and installed automatically. Manually edit `latest.json` with the signature of each built update zip, and host them on a CDN (see below).

* e.g. `cat "src-tauri/target/release/bundle/macos/Angular Momentum.app.tar.gz.sig"` to retrieve the signature.

### Tauri platform builds

#### Windows
Run on a windows install; run `npm run tauri build` to build a standalone release for Windows.

#### MacOS
See build instructions above.

#### Linux
On a linux install; run `npm run tauri build` to build a standalone release for Linux.

## Push Notifications

The app includes a complete push notification system that works across all platforms (Web, PWA, Desktop, Mobile).

### Architecture

- **NotificationService** - Main service for managing notifications, permissions, and notification history
- **NotificationBellComponent** - UI component with bell icon, badge, and dropdown notification center
- **WebSocket Delivery** - Real-time notification delivery via Socket.IO
- **GraphQL API** - Backend mutations for sending notifications
- **Platform Support**:
  - **Web/PWA**: Uses Web Notifications API + Service Worker
  - **Tauri (Desktop/Mobile)**: Uses `tauri-plugin-notification` for native OS notifications

### Quick Start

#### 1. Add Notification Bell to Your App

```typescript
import { NotificationBellComponent } from './components/notification-bell/notification-bell.component';

@Component({
  imports: [NotificationBellComponent],
  template: `
    <nav>
      <app-notification-bell />
    </nav>
  `
})
```

#### 2. Request Permission

```typescript
constructor(private notificationService: NotificationService) {}

async enableNotifications() {
  const granted = await this.notificationService.requestPermission();
}
```

#### 3. Send Notifications

**From Angular:**
```typescript
await this.notificationService.show({
  title: 'New Message',
  body: 'You have a new message',
  icon: '/assets/icons/icon.png'
});
```

**From Backend (GraphQL):**
```graphql
mutation {
  sendNotification(
    title: "System Update"
    body: "Update available"
  ) {
    success
    message
  }
}
```

**From Backend (Node.js):**
```typescript
import { broadcastNotification } from './services/notificationService';

const io = app.get('io');
broadcastNotification(io, {
  title: 'Alert',
  body: 'Maintenance tonight'
});
```

### API Reference

**NotificationService Methods:**
- `show(options)` - Show a notification
- `requestPermission()` - Request notification permission
- `checkPermission()` - Check current permission status
- `isSupported()` - Check if notifications are supported
- `markAsRead(id)` - Mark notification as read
- `clearAll()` - Clear all notifications

**Reactive Signals:**
- `permissionGranted` - Permission status
- `notifications` - All notifications array
- `unreadCount` - Number of unread notifications

**Backend Functions:**
- `broadcastNotification(io, notification)` - Send to all clients
- `sendNotificationToUser(io, socketId, notification)` - Send to specific user
- `sendNotificationToRoom(io, room, notification)` - Send to room/group

### Feature Flag

Push notifications are controlled by the `Notifications` feature flag. Toggle via GraphQL:

```graphql
mutation {
  updateFeatureFlag(key: "Notifications", value: true) {
    key
    value
  }
}
```

### Platform Notes

- **Web/PWA**: Requires HTTPS in production, service worker registration
- **Tauri Desktop**: Native OS notifications, works even when app is closed
- **Tauri Mobile**: Requires notification permissions in platform-specific configs

## CDN

This repo relies on serving assets from a CDN. The current implementation is linode/akamai but you'll want to replace that with your preferred provider.

### Structure

```
angularmomentum/
├── assets/
│   ├── production/
│   └── staging/
├── dist/
│   └── (future versioned releases folders here)
```
