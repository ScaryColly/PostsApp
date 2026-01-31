/** @type {import('jest').Config} */
module.exports = {
  testMatch: ["**/dist/tests/**/*.test.js"],
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/dist/setupTests.js"],
};
