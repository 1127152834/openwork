import { describe, expect, test } from "bun:test";

import { deriveFileLedger } from "../src/app/utils/file-ledger";

const userMessage = (id: string, parts: any[]) => ({
  info: { id, role: "user" },
  parts,
});

const assistantMessage = (id: string, parts: any[]) => ({
  info: { id, role: "assistant" },
  parts,
});

describe("deriveFileLedger", () => {
  test("tracks input/reference/output with first-source ownership", () => {
    const messages = [
      userMessage("u1", [{ type: "file", url: "file:///workspace/src/main.ts", filename: "main.ts", mime: "text/plain" }]),
      assistantMessage("a1", [{ type: "tool", tool: "read", state: { input: { path: "src/main.ts" } } }]),
      assistantMessage("a2", [{ type: "tool", tool: "edit", state: { path: "src/main.ts" } }]),
      assistantMessage("a3", [{ type: "tool", tool: "write", state: { path: "docs/output.md" } }]),
      userMessage("u2", [{ type: "file", url: "data:image/png;base64,AAA", filename: "diagram.png", mime: "image/png" }]),
      assistantMessage("a4", [{ type: "tool", tool: "grep", state: { input: { path: "docs/guide.md", pattern: "TODO" } } }]),
    ];

    const ledger = deriveFileLedger(messages as any);

    expect(ledger.input.map((item) => item.path)).toEqual(["diagram.png", "src/main.ts"]);
    expect(ledger.output.map((item) => item.path)).toEqual(["docs/output.md"]);
    expect(ledger.reference.map((item) => item.path)).toEqual(["docs/guide.md"]);

    const main = ledger.all.find((item) => item.path === "src/main.ts");
    expect(main?.category).toBe("input");
  });

  test("ignores remote links for input files", () => {
    const messages = [
      userMessage("u1", [{ type: "file", url: "https://example.com/a.pdf", filename: "a.pdf", mime: "application/pdf" }]),
      userMessage("u2", [{ type: "file", url: "file:///workspace/notes/todo.md", filename: "todo.md", mime: "text/plain" }]),
    ];

    const ledger = deriveFileLedger(messages as any);

    expect(ledger.input.map((item) => item.path)).toEqual(["notes/todo.md"]);
  });
});
