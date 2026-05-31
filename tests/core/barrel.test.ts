import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../..");

describe("main sently barrel", () => {
  test("src/index.ts does not re-export the react plugin", () => {
    const src = readFileSync(join(root, "src/index.ts"), "utf8");
    expect(src).not.toMatch(/from "\.\/react\.js"/);
    expect(src).not.toContain("reactPlugin");
  });

  test("createMailer from main barrel resolves without react peers installed", async () => {
    const { createMailer } = await import("../../src/index.js");
    const { ResendTransport } = await import("../../src/transports/resend.js");

    const mailer = await createMailer({
      transport: new ResendTransport({ apiKey: "re_test" }),
    });

    expect(mailer).toBeDefined();
    expect(typeof mailer.send).toBe("function");
  });

  test("createSMTPMailer is exported from main barrel", async () => {
    const { createSMTPMailer } = await import("../../src/index.js");
    expect(typeof createSMTPMailer).toBe("function");
  });
});
