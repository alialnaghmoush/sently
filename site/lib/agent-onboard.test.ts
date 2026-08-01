import { describe, expect, test } from "bun:test";
import { agentOnboardPrompt, agentsMdUrl, DOCS_ORIGIN, llmsTxtUrl } from "./agent-onboard.ts";

describe("agent onboard URLs", () => {
  test("points at sently docs origin and AGENTS.md", () => {
    expect(DOCS_ORIGIN).toBe("https://sently.dev");
    expect(llmsTxtUrl()).toBe("https://sently.dev/llms.txt");
    expect(agentsMdUrl()).toBe(
      "https://raw.githubusercontent.com/alialnaghmoush/sently/main/AGENTS.md",
    );
    expect(agentOnboardPrompt()).toBe(
      `Read ${DOCS_ORIGIN}/llms.txt and https://raw.githubusercontent.com/alialnaghmoush/sently/main/AGENTS.md…`,
    );
  });

  test("honors a custom origin for local preview", () => {
    expect(agentOnboardPrompt("http://localhost:3000")).toBe(
      "Read http://localhost:3000/llms.txt and https://raw.githubusercontent.com/alialnaghmoush/sently/main/AGENTS.md…",
    );
  });
});
