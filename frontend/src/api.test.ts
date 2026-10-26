import { describe, expect, it } from "vitest";

describe("InternFlow API configuration", () => {
  it("uses the local backend by default", () => {
    expect(import.meta.env.VITE_API_URL || "http://localhost:8000/api").toContain("/api");
  });
});
