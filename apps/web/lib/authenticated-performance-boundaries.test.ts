import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = new URL("../", import.meta.url);

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, appRoot), "utf8");
}

function listFiles(relativePath: string): string[] {
  const absolutePath = new URL(relativePath, appRoot);
  return readdirSync(absolutePath).flatMap((entry) => {
    const entryPath = join(absolutePath.pathname, entry);
    const relativeEntryPath = `${relativePath}/${entry}`;

    if (statSync(entryPath).isDirectory()) {
      return listFiles(relativeEntryPath);
    }

    return relativeEntryPath;
  });
}

describe("authenticated performance boundaries", () => {
  it("keeps generic loading and not-found states server-renderable", () => {
    const routeState = read("components/authenticated-route-state.tsx");
    const globalErrorPage = read("app/(authenticated)/error.tsx");
    const teamErrorPage = read("app/(authenticated)/team/error.tsx");

    expect(routeState.startsWith('"use client";')).toBe(false);
    expect(routeState).not.toContain("export function AuthenticatedRouteError");
    expect(globalErrorPage).toContain(
      'import { AuthenticatedRouteError } from "@/components/authenticated-route-error";',
    );
    expect(teamErrorPage).toContain(
      'import { AuthenticatedRouteError } from "@/components/authenticated-route-error";',
    );
  });

  it("keeps the feedback dialog out of the initial authenticated shell chunk", () => {
    const shell = read("components/app-shell.tsx");

    expect(shell).not.toContain('from "./feedback-widget"');
    expect(shell).toContain('from "./feedback-dialog-loader"');
    expect(shell).toContain("{feedbackOpen ? (");
  });

  it("keeps authenticated heavy-panel loaders route-specific", () => {
    const authenticatedRoutes = listFiles("app/(authenticated)")
      .filter((file) => file.endsWith(".tsx"))
      .map((file) => [file, read(file)] as const);

    const sharedLoaderImports = authenticatedRoutes.filter(([, source]) =>
      source.includes("@/components/page-panel-loaders"),
    );

    expect(sharedLoaderImports).toEqual([]);
  });
});
