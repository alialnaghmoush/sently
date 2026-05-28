import { describe, expect, test } from "bun:test";
import {
  extractEmails,
  isValidEmail,
  parseAddresses,
  toEnvelope,
  toMIMEHeader,
} from "../../src/core/address.js";

describe("parseAddresses", () => {
  test("plain email string", () => {
    expect(parseAddresses("ali@example.com")).toEqual([{ address: "ali@example.com" }]);
  });

  test("name and angle brackets", () => {
    expect(parseAddresses("Ali <ali@example.com>")).toEqual([
      { name: "Ali", address: "ali@example.com" },
    ]);
  });

  test("Address object", () => {
    expect(parseAddresses({ name: "Ali", address: "ali@example.com" })).toEqual([
      { name: "Ali", address: "ali@example.com" },
    ]);
  });

  test("array of mixed inputs", () => {
    expect(parseAddresses(["a@b.com", { address: "c@d.com" }])).toEqual([
      { address: "a@b.com" },
      { address: "c@d.com" },
    ]);
  });

  test("Arabic display name", () => {
    const result = parseAddresses("علي <ali@example.com>");
    expect(result[0]?.name).toBe("علي");
    expect(result[0]?.address).toBe("ali@example.com");
  });

  test("quoted display name", () => {
    expect(parseAddresses('"Ali, Jr." <ali@example.com>')).toEqual([
      { name: "Ali, Jr.", address: "ali@example.com" },
    ]);
  });

  test("comma-separated list", () => {
    expect(parseAddresses("a@b.com, b@c.com")).toHaveLength(2);
  });
});

describe("toEnvelope", () => {
  test("returns bare email", () => {
    expect(toEnvelope({ name: "Ali", address: "ali@example.com" })).toBe("ali@example.com");
  });
});

describe("toMIMEHeader", () => {
  test("ASCII name with brackets", () => {
    expect(toMIMEHeader({ name: "Ali", address: "ali@example.com" })).toBe(
      "Ali <ali@example.com>",
    );
  });

  test("Arabic name RFC 2047 encoded", () => {
    const header = toMIMEHeader({ name: "علي", address: "ali@example.com" });
    expect(header).toMatch(/^=\?UTF-8\?B\?.+\?= <ali@example.com>$/);
  });

  test("no name returns address only", () => {
    expect(toMIMEHeader({ address: "ali@example.com" })).toBe("ali@example.com");
  });
});

describe("extractEmails", () => {
  test("extracts from mixed input", () => {
    expect(extractEmails(["Ali <a@b.com>", "c@d.com"])).toEqual(["a@b.com", "c@d.com"]);
  });
});

describe("isValidEmail", () => {
  test("valid emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  test("invalid emails", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
  });
});
