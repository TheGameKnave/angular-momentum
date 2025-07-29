# angular-momentum

This repo is intended to allow spooling up Angular projects in a monorepo rapidly, with a minimum of configuration.

## Current features
* Angular 20 (with Node 22.14)
* Parallel server/client execution
* Bare-bones api proxy to the back-end *
* SASS boilerplate included
* Frontend environment detection/switching *
* Auto-unsub from subscriptions and component variables
* Heroku deployment
* Google Analytics
* Cookie API
* Service worker to persist app and manage versions *
* Hot module replacement for faster dev iteration
* Typescript with node for back-end
* Client & Server unit testing via jasmine
* Benchmark memory usage and response times (throttled for mobile) in tests
* Internationalization (i18n) with Transloco
* IndexedDB for offline storage *
* e2e testing with TestCafe + snapshots
* Feature flags *
* CI/CD (github actions, sonar)
* Hotjar script for user behavior analysis
* Websockets to reconcile disparities between server and local data *
* public api with GraphQL *
* Tauri integration for app bundling

(* indicates a feature that’s visible in the sample app)

## Future features:
* DB-agnostic query layer
* Elf state management *
* Immutable.js or immer or Timm to minimize mutation
* Lighthouse CI to mitigate performance slip
* Auth-agnostic (or maybe just Firebase) user management (emails and password resetting and deliverability) *

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

Create your `.env` file from the `.env.example` **and never commit sensitive information like API keys or passwords or usernames or email addresses**


### git branches

Develop against branches from `dev` feature branch using prefix `feature/`. `main` is for production releases, `staging` is to test prod.

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
`git remote rename heroku dev`  
`heroku git:remote -a <APP_NAME>-staging`  
`git remote rename heroku staging`  
`heroku git:remote -a <APP_NAME>`  
`git remote rename heroku production`

### Deploy dev

`git push dev dev:main`

### Deploy staging

from staging branch:  
`git push staging staging:main`

### Deploy production

from main branch:  
`git push production main:main`