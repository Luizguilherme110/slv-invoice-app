import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The app itself runs in Chrome from file://, so the tests run against a
    // DOM too: jsPDF and ExcelJS both reach for browser globals (Blob, atob).
    environment: "jsdom",
    include: ["tests/**/*.test.js"],
  },
});
