import { describe, it, expect } from "vitest";
import { metadata } from "@/app/layout";

describe("RootLayout Metadata", () => {
  it("possui o título da aba configurado exatamente como 'Bússola Astrológica'", () => {
    expect(metadata.title).toBe("Bússola Astrológica");
  });
});
