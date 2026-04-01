import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/api/tests/**/*.test.ts"],
  },
});
