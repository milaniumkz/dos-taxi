import type { Config } from 'jest';

const baseProjectConfig: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@dos/shared-types$': '<rootDir>/../../packages/shared-types/src/index.ts',
    '^@dos/shared-types/(.*)$': '<rootDir>/../../packages/shared-types/src/$1',
  },
  testPathIgnorePatterns: ['/dist/'],
  collectCoverageFrom: [
    'src/modules/**/*.ts',
    '!src/modules/**/*.module.ts',
    '!src/modules/**/*.spec.ts',
    '!src/modules/**/dto/**/*.ts',
    '!src/modules/**/entities/**/*.ts',
    '!src/modules/**/enums/**/*.ts',
  ],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
};

const config: Config = {
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      lines: 80,
      statements: 80,
    },
    './src/modules/': {
      branches: 70,
      lines: 80,
      statements: 80,
    },
  },
  projects: [
    {
      ...baseProjectConfig,
      displayName: 'unit',
      testMatch: [
        '<rootDir>/src/**/*.spec.ts',
        '<rootDir>/test/unit/**/*.spec.ts',
      ],
    },
    {
      ...baseProjectConfig,
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
    },
    {
      ...baseProjectConfig,
      displayName: 'e2e',
      testMatch: [
        '<rootDir>/test/e2e/**/*.spec.ts',
        '<rootDir>/test/e2e/**/*.e2e-spec.ts',
      ],
    },
  ],
};

export default config;
