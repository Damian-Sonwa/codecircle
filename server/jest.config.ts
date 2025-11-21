import type {Config} from 'jest';

const shared: Partial<Config> = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts']
};

const config: Config = {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/tests/unit/**/*.test.ts'],
      ...shared
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/tests/integration/**/*.test.ts'],
      ...shared
    },
    {
      displayName: 'socket',
      testMatch: ['<rootDir>/src/tests/socket/**/*.test.ts'],
      ...shared
    }
  ]
};

export default config;


