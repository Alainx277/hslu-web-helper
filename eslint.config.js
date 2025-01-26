// @ts-check

const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  {
    files: ["src/**/*.js"],
    rules: eslint.configs.recommended.rules,
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    extends: tseslint.configs.recommended,
    rules: {
      "@typescript-eslint/strict-boolean-expressions": "error",
    },
  },
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
    },
  },
);
