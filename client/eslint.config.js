// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");
const rxjsX = require("eslint-plugin-rxjs-x");


module.exports = tseslint.config(
  {
    ignores: ['**/*.spec.ts']
  },
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
      rxjsX.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
      'rxjs-x/no-ignored-subscription': [
        'error',
        {
          allowTeardownOperators: ['take', 'takeUntil', 'first', 'last']
        }
      ]
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      '@angular-eslint/template/i18n': [
      'error',
      {
        checkId: true,
        checkText: true,
        checkAttributes: false,
        ignoreTextOfElements: ['script', 'style'],
        boundTextAllowedPattern: '\\s*\\{\\{.+\\}\\}\\s*' // ✅ Allows {{ ... }} bindings
      }
    ],
    },
  }
);
