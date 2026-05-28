const path = require('path');

const shellQuote = (value) => `'${value.replace(/'/g, `'\\''`)}'`;

const quoteFiles = (filenames) =>
  filenames.map((f) => shellQuote(path.relative(process.cwd(), f))).join(' ');

const buildEslintCommand = (filenames) =>
  `eslint --fix -- ${quoteFiles(filenames)}`;

const buildPrettierCommand = (filenames) =>
  `prettier --write --config ./.prettierrc --ignore-path .prettierignore -- ${quoteFiles(
    filenames,
  )}`;

module.exports = {
  'src/**/*.{js,jsx,ts,tsx}': [buildEslintCommand, buildPrettierCommand],
  '*.{js,jsx,ts,tsx,json,css,scss,md,yml,yaml}': [buildPrettierCommand],
  '.*.{js,json,css,scss,md,yml,yaml}': [buildPrettierCommand],
};
