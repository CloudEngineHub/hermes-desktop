import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(
  join(import.meta.dirname, "../src/renderer/src/assets/main.css"),
  "utf-8",
);

describe("native focus outlines", () => {
  it("suppresses the OS-accent Chromium outline globally", () => {
    expect(CSS).toMatch(/\n:focus\s*\{\s*outline:\s*none;\s*\}/);
  });
});
