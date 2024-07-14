// @ts-check

const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");

const recommended = tseslint.configs.recommended;
recommended.forEach((c) => (c.files = ["src/**/*.ts", "src/**/*.tsx"]));

module.exports = tseslint.config(
  {
    files: ["src/**/*.js"],
    rules: eslint.configs.recommended.rules,
  },
  ...recommended,
);
