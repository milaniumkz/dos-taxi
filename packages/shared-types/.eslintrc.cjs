module.exports = {
  root: true,
  extends: ['../config/eslint/base.cjs'],
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: ['dist/'],
  rules: {
    'import/order': 'off',
  },
};
