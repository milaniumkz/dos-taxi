module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  ignorePatterns: ['.next/', 'node_modules/'],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
  },
};
