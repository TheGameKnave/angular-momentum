// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  // Allow enabling console output for debugging via environment variable
  // Usage: KARMA_CONSOLE=true npm test
  const enableConsole = process.env.KARMA_CONSOLE === 'true';

  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-sabarivka-reporter'),
      require('karma-coverage'),
    ],
    files: [
      { pattern: './karma-setup.js', included: true, served: true, watched: false }
    ],
    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution with `random: false`
        // or set a specific seed with `seed: 4321`
      },
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
      captureConsole: enableConsole // Suppress browser console output unless KARMA_CONSOLE=true
    },
    browserConsoleLogOptions: enableConsole ? {} : {
      level: 'disable',
      terminal: false
    },
    jasmineHtmlReporter: {
      suppressAll: true // removes the duplicated traces
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage'),
      subdir: '.',
      include: [
        'src/**/*.(ts|js)',
        '!src/main.ts',
        '!src/**/*.spec.(ts|js)',
        '!src/**/environment*.(ts|js)',
        '!*.config.js',
        '!karma-setup.js'
      ],
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcovonly' }
      ]
    },
    reporters: ['sabarivka', 'progress', 'kjhtml'],
    browsers: ['Chrome'],
    restartOnFileChange: true,
    preprocessors: {
      'src/**/*.ts': ['coverage']
    },
    // Suppress 404 warnings for PrimeIcons fonts (not needed in tests)
    middleware: ['suppressPrimeIconsFonts'],
    plugins: [
      ...config.plugins,
      {
        'middleware:suppressPrimeIconsFonts': ['factory', function() {
          let hasWarned = false;
          return function(req, res, next) {
            // Only suppress known PrimeIcons font files
            if (req.url.match(/\/media\/primeicons.*\.(woff2?|ttf|eot)$/)) {
              if (!hasWarned) {
                /**/console.log('ℹ️  Suppressing PrimeIcons font requests (not needed for tests)');
                hasWarned = true;
              }
              res.writeHead(204);
              res.end();
              return;
            }
            next();
          };
        }]
      }
    ],
  });
};
