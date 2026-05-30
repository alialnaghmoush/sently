import { describe, expect, test } from "bun:test";
import type { MailOptions } from "../../src/core/types.js";
import { simpleEngine, templatePlugin } from "../../src/plugins/template.js";

describe("simpleEngine", () => {
  test("replaces {{name}} with data value", () => {
    expect(simpleEngine("Hello, {{name}}!", { name: "Ali" })).toBe("Hello, Ali!");
  });

  test("replaces multiple variables", () => {
    expect(simpleEngine("{{greeting}}, {{name}}!", { greeting: "Hi", name: "Bob" })).toBe(
      "Hi, Bob!",
    );
  });

  test("outputs empty string for unknown variables", () => {
    expect(simpleEngine("Hello, {{name}}!", {})).toBe("Hello, !");
  });
});

describe("templatePlugin", () => {
  const plugin = templatePlugin({
    engine: simpleEngine,
    templates: {
      welcome: "<h1>Hello, {{name}}!</h1>",
      reset: "<p>Reset link: {{link}}</p>",
    },
  });

  const baseOptions: MailOptions = {
    from: "sender@example.com",
    to: "recipient@example.com",
    subject: "Test",
  };

  test("sets options.html to rendered output", () => {
    const result = plugin({ ...baseOptions, template: "welcome", data: { name: "Ali" } });
    expect(result.html).toBe("<h1>Hello, Ali!</h1>");
  });

  test("strips template and data from returned options", () => {
    const result = plugin({ ...baseOptions, template: "welcome", data: { name: "Ali" } });
    expect(result.template).toBeUndefined();
    expect(result.data).toBeUndefined();
  });

  test("throws if template name not found", () => {
    expect(() => plugin({ ...baseOptions, template: "missing", data: {} })).toThrow(
      'sently: template "missing" not found',
    );
  });

  test("no-ops when options.template is undefined", () => {
    const options = { ...baseOptions, text: "plain" };
    expect(plugin(options)).toBe(options);
  });

  test("custom engine function is called with correct args", () => {
    const calls: Array<[string, Record<string, unknown>]> = [];
    const customPlugin = templatePlugin({
      engine: (template, data) => {
        calls.push([template, data]);
        return "rendered";
      },
      templates: { test: "tmpl" },
    });

    customPlugin({ ...baseOptions, template: "test", data: { x: 1 } });
    expect(calls).toEqual([["tmpl", { x: 1 }]]);
  });
});
