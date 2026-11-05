import { describe, it, expect } from "vitest";
import { importCopy } from "./import-copy";
const file = (name: string, text: string, size?: number) => ({
  name,
  size: size ?? new TextEncoder().encode(text).length,
  arrayBuffer: async () => new TextEncoder().encode(text).buffer,
});
describe("local text import", () => {
  it("imports text and keeps markup literal", async () =>
    expect(
      await importCopy(
        file("offer.md", '<script>alert("sample")</script> Fixed rate offer.'),
      ),
    ).toContain("<script>"));
  it("rejects unsupported files, size and empty input", async () => {
    await expect(
      importCopy(file("offer.pdf", "A fictional offer with full terms.")),
    ).rejects.toThrow(".txt");
    await expect(
      importCopy(
        file("offer.txt", "A fictional offer with full terms.", 50001),
      ),
    ).rejects.toThrow("50 KB");
    await expect(importCopy(file("offer.txt", "  "))).rejects.toThrow(
      "20–5,000",
    );
  });
  it("rejects binary and malformed UTF-8 content", async () => {
    await expect(
      importCopy(
        file("offer.txt", "Long enough content but with a binary \u0000 byte"),
      ),
    ).rejects.toThrow("binary");
    await expect(
      importCopy({
        name: "offer.txt",
        size: 2,
        arrayBuffer: async () => new Uint8Array([255, 254]).buffer,
      }),
    ).rejects.toThrow("UTF-8");
  });
  it("never silently truncates content", async () =>
    expect(importCopy(file("long.txt", "a".repeat(5001)))).rejects.toThrow(
      "5,000",
    ));
});
