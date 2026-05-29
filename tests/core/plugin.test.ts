import { describe, expect, test } from "bun:test";
import { runPlugins } from "../../src/core/plugin.js";
import type { MailOptions, MailPlugin } from "../../src/core/types.js";

const baseOptions: MailOptions = {
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Hello",
  text: "Plain body",
};

describe("runPlugins", () => {
  test("empty plugins array returns options unchanged", async () => {
    const result = await runPlugins(baseOptions, []);
    expect(result).toBe(baseOptions);
  });

  test("undefined plugins returns options unchanged", async () => {
    const result = await runPlugins(baseOptions, undefined);
    expect(result).toBe(baseOptions);
  });

  test("single sync plugin transforms options correctly", async () => {
    const addPrefix: MailPlugin = (options) => ({
      ...options,
      subject: `[PREFIX] ${options.subject}`,
    });

    const result = await runPlugins(baseOptions, [addPrefix]);
    expect(result.subject).toBe("[PREFIX] Hello");
    expect(result.text).toBe("Plain body");
  });

  test("single async plugin transforms options correctly", async () => {
    const asyncPlugin: MailPlugin = async (options) => {
      await Promise.resolve();
      return { ...options, subject: "Async subject" };
    };

    const result = await runPlugins(baseOptions, [asyncPlugin]);
    expect(result.subject).toBe("Async subject");
  });

  test("multiple plugins run in order", async () => {
    const pluginA: MailPlugin = (options) => ({
      ...options,
      subject: `${options.subject}-A`,
    });
    const pluginB: MailPlugin = (options) => ({
      ...options,
      subject: `${options.subject}-B`,
    });

    const result = await runPlugins(baseOptions, [pluginA, pluginB]);
    expect(result.subject).toBe("Hello-A-B");
  });

  test("plugin can add HTML to a text-only message", async () => {
    const addHtml: MailPlugin = (options) => ({
      ...options,
      html: "<p>Footer</p>",
    });

    const result = await runPlugins(baseOptions, [addHtml]);
    expect(result.html).toBe("<p>Footer</p>");
    expect(result.text).toBe("Plain body");
  });

  test("plugin can modify subject", async () => {
    const changeSubject: MailPlugin = (options) => ({
      ...options,
      subject: "Updated",
    });

    const result = await runPlugins(baseOptions, [changeSubject]);
    expect(result.subject).toBe("Updated");
  });

  test("plugins do not mutate the original options object", async () => {
    const original = { ...baseOptions };
    const mutatingPlugin: MailPlugin = (options) => ({
      ...options,
      subject: "Changed",
    });

    await runPlugins(baseOptions, [mutatingPlugin]);
    expect(baseOptions).toEqual(original);
    expect(baseOptions.subject).toBe("Hello");
  });
});
