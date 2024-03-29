module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/test-out/**/*.js",
    "<rootDir>/lib/**/*.test.ts",
  ],
  modulePathIgnorePatterns: [
    ".*\.d\.ts"
  ],
  collectCoverageFrom: [
    "<rootDir>/lib/**/*.ts"
  ],
  coverageReporters: ["lcov", "text", "html"],
  setupFiles: [
    "trace-unhandled/register",
  ],
  maxConcurrency: 999,
};
