import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node", // ← NOT happy-dom. Critical.
		include: ["tests/e2e/**/*.test.ts"],
		testTimeout: 60_000,
		hookTimeout: 60_000,
		globalSetup: "./tests/e2e/globalSetup.ts",
		// WebDriver state is shared across a session; disable isolation
		pool: "threads",
	},
});
