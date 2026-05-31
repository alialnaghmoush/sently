import { describe, expect, test } from "bun:test";

describe("sently/smtp", () => {
  test("does not export createMailer alias", async () => {
    const mod = await import("../../src/smtp-mailer.js");
    expect(mod.createSMTPMailer).toBeDefined();
    expect("createMailer" in mod).toBe(false);
  });

  test("createSMTPMailer is exported from main barrel", async () => {
    const { createSMTPMailer } = await import("../../src/index.js");
    expect(typeof createSMTPMailer).toBe("function");
  });

  test("createSMTPMailer is exported from sently/smtp entry", async () => {
    const { createSMTPMailer } = await import("../../src/smtp-mailer.js");
    expect(typeof createSMTPMailer).toBe("function");
  });
});
