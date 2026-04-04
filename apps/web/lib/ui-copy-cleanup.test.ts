import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const bannedCopy = [
  "eyebrow=\"Recovered\"",
  "Recovered roleplay",
  "Recovered session",
  "Recovered coaching moment",
  "recovered environment",
  "recovered app database",
];

async function listFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(root, entry.name);
      if (entry.isDirectory()) {
        return listFiles(resolved);
      }

      return resolved.endsWith(".tsx") ? [resolved] : [];
    }),
  );

  return files.flat();
}

describe("authenticated UI copy cleanup", () => {
  it("removes recovery-era wording from authenticated pages and settings/roleplay components", async () => {
    const root = path.resolve(process.cwd(), "app/(authenticated)");
    const componentsRoot = path.resolve(process.cwd(), "components");
    const files = [
      ...(await listFiles(root)),
      path.join(componentsRoot, "integrations-settings-panel.tsx"),
      path.join(componentsRoot, "roleplay-panel.tsx"),
      path.join(componentsRoot, "settings-workspace-panel.tsx"),
    ];

    const fileContents = await Promise.all(
      files.map(async (filePath) => ({
        filePath,
        content: await fs.readFile(filePath, "utf8"),
      })),
    );

    const offenders = fileContents.flatMap(({ filePath, content }) =>
      bannedCopy
        .filter((phrase) => content.includes(phrase))
        .map((phrase) => `${path.relative(process.cwd(), filePath)} -> ${phrase}`),
    );

    expect(offenders).toEqual([]);
  });
});
