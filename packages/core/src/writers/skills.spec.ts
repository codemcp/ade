import { describe, it, expect } from "vitest";
import { skillsWriter } from "./skills.js";

describe("skillsWriter", () => {
  const emptyContext = { resolved: {} };

  it("returns skills from config", async () => {
    const result = await skillsWriter.write(
      {
        skills: [
          {
            name: "my-skill",
            description: "A test skill",
            body: "Do the thing."
          }
        ]
      },
      emptyContext
    );

    expect(result.skills).toHaveLength(1);
    expect(result.skills![0]).toEqual({
      name: "my-skill",
      description: "A test skill",
      body: "Do the thing."
    });
  });

  it("returns multiple skills", async () => {
    const result = await skillsWriter.write(
      {
        skills: [
          { name: "skill-a", description: "First", body: "Body A" },
          { name: "skill-b", description: "Second", body: "Body B" }
        ]
      },
      emptyContext
    );

    expect(result.skills).toHaveLength(2);
    expect(result.skills!.map((s) => s.name)).toEqual(["skill-a", "skill-b"]);
  });

  it("returns only the skills key", async () => {
    const result = await skillsWriter.write(
      {
        skills: [{ name: "x", description: "desc", body: "body" }]
      },
      emptyContext
    );

    expect(Object.keys(result)).toEqual(["skills"]);
  });

  it("preserves multi-line body content", async () => {
    const body =
      "# Architecture\n\nUse layered architecture.\n\n## Rules\n- Rule 1\n- Rule 2";
    const result = await skillsWriter.write(
      {
        skills: [{ name: "arch", description: "Architecture", body }]
      },
      emptyContext
    );

    expect(result.skills![0]).toMatchObject({ body });
  });

  it("returns external skills with source reference", async () => {
    const result = await skillsWriter.write(
      {
        skills: [
          {
            name: "playwright-cli",
            source: "microsoft/playwright-cli/skills/playwright-cli"
          }
        ]
      },
      emptyContext
    );

    expect(result.skills).toHaveLength(1);
    expect(result.skills![0]).toEqual({
      name: "playwright-cli",
      source: "microsoft/playwright-cli/skills/playwright-cli"
    });
  });

  it("passes through replaces field on inline skills", async () => {
    const result = await skillsWriter.write(
      {
        skills: [
          {
            name: "ext-architecture",
            description: "Extension architecture",
            body: "Extension body.",
            replaces: ["architecture"]
          }
        ]
      },
      emptyContext
    );

    expect(result.skills).toHaveLength(1);
    expect(result.skills![0]).toEqual({
      name: "ext-architecture",
      description: "Extension architecture",
      body: "Extension body.",
      replaces: ["architecture"]
    });
  });

  it("passes through single assets entry on inline skill", async () => {
    const result = await skillsWriter.write(
      {
        skills: [
          {
            name: "arch-skill",
            description: "Architecture skill",
            body: "See [details](references/details.md).",
            assets: {
              "references/details.md": "## Details\n\nMore info."
            }
          }
        ]
      },
      emptyContext
    );

    expect(result.skills).toHaveLength(1);
    expect(result.skills![0]).toEqual({
      name: "arch-skill",
      description: "Architecture skill",
      body: "See [details](references/details.md).",
      assets: {
        "references/details.md": "## Details\n\nMore info."
      }
    });
  });

  it("passes through multiple assets with different path prefixes", async () => {
    const assets = {
      "references/folder-structure.md":
        "## Folder Structure\n\nDetailed content.",
      "references/file-naming.md": "## File Naming\n\nConventions.",
      "scripts/setup.sh": "#!/bin/bash\necho setup"
    };

    const result = await skillsWriter.write(
      {
        skills: [
          {
            name: "multi-asset-skill",
            description: "Skill with many assets",
            body: "Main body.",
            assets
          }
        ]
      },
      emptyContext
    );

    expect(result.skills).toHaveLength(1);
    expect(
      (result.skills![0] as { assets: Record<string, string> }).assets
    ).toEqual(assets);
  });

  it("passes through replaces field on external skills", async () => {
    const result = await skillsWriter.write(
      {
        skills: [
          {
            name: "ext-tdd",
            source: "org/repo/skills/ext-tdd",
            replaces: ["tdd"]
          }
        ]
      },
      emptyContext
    );

    expect(result.skills).toHaveLength(1);
    expect(result.skills![0]).toEqual({
      name: "ext-tdd",
      source: "org/repo/skills/ext-tdd",
      replaces: ["tdd"]
    });
  });

  it("handles mixed inline and external skills", async () => {
    const result = await skillsWriter.write(
      {
        skills: [
          { name: "my-skill", description: "Inline", body: "Do stuff." },
          { name: "ext-skill", source: "org/repo/skills/ext" }
        ]
      },
      emptyContext
    );

    expect(result.skills).toHaveLength(2);
    expect(result.skills![0]).toMatchObject({
      name: "my-skill",
      body: "Do stuff."
    });
    expect(result.skills![1]).toMatchObject({
      name: "ext-skill",
      source: "org/repo/skills/ext"
    });
  });
});
