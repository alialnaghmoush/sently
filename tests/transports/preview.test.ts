import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MailOptions } from "../../src/core/types.js";
import { PreviewTransport } from "../../src/transports/preview.js";

const spawnCalls: Array<{ command: string; args: string[] }> = [];

mock.module("node:child_process", () => ({
  spawn: (command: string, args: string[]) => ({
    unref: () => {
      spawnCalls.push({ command, args });
    },
  }),
}));

const baseOptions: MailOptions = {
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Hello World Test",
  text: "Plain body",
  html: "<p>HTML body</p>",
};

describe("PreviewTransport", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "sently-preview-"));
    spawnCalls.length = 0;
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("writes a .eml file to the configured outDir", async () => {
    const transport = new PreviewTransport({ outDir: tempDir, format: "eml" });
    const result = await transport.send(baseOptions);

    expect(result.response).toStartWith(`preview: ${tempDir}/`);
    expect(result.response).toEndWith(".eml");
    expect(result.accepted).toEqual(["recipient@example.com"]);
    expect(result.rejected).toEqual([]);

    const filepath = result.response.replace("preview: ", "");
    const content = await readFile(filepath);
    const text = new TextDecoder().decode(content);
    expect(text).toContain("Plain body");
  });

  test("filename includes sanitized subject", async () => {
    const transport = new PreviewTransport({ outDir: tempDir });
    const result = await transport.send({
      ...baseOptions,
      subject: "Hello!!! World???",
    });

    expect(result.response).toMatch(/Hello-World/);
  });

  test("format html writes only HTML content", async () => {
    const transport = new PreviewTransport({ outDir: tempDir, format: "html" });
    const result = await transport.send(baseOptions);

    const filepath = result.response.replace("preview: ", "");
    const content = await readFile(filepath, "utf8");
    expect(content).toBe("<p>HTML body</p>");
    expect(content).not.toContain("multipart");
  });

  test("missing outDir defaults to ./.emails", async () => {
    const transport = new PreviewTransport();
    expect(transport).toBeDefined();
    const defaultDir = "./.emails";
    await rm(defaultDir, { recursive: true, force: true });

    const result = await transport.send({ ...baseOptions, subject: "Default dir" });
    expect(result.response).toStartWith(`preview: ${defaultDir}/`);

    await rm(defaultDir, { recursive: true, force: true });
  });

  test("open false does not spawn child process", async () => {
    const transport = new PreviewTransport({ outDir: tempDir, open: false });
    await transport.send(baseOptions);
    expect(spawnCalls).toHaveLength(0);
  });

  test("verify returns ok preview result", async () => {
    const transport = new PreviewTransport();
    const result = await transport.verify();
    expect(result).toEqual({ ok: true, provider: "preview" });
  });
});
