module.exports = {
  root: true,
  extends: ['../../packages/config/eslint/base.cjs'],
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  ignorePatterns: ['dist/', 'coverage/'],
  rules: {
    'import/order': 'off',
  },
};
