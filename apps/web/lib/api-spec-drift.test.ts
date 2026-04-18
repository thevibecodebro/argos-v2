import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type OpenApiDocument = {
  paths: Record<string, Record<string, unknown>>;
};

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SPEC_PATH = path.join(REPO_ROOT, "packages", "api-spec", "openapi.json");
const APP_ROOT = path.join(REPO_ROOT, "apps", "web");
const API_ROOT = path.join(APP_ROOT, "app", "api");

function listFiles(dir: string, predicate: (filePath: string) => boolean): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath, predicate));
      continue;
    }

    if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeFrontendPath(value: string): string {
  return value
    .replace(/^\/api/, "")
    .replace(/\$\{[^}]+\}/g, "{param}");
}

function normalizePathShape(value: string): string {
  return value.replace(/\{[^}]+\}/g, "{param}");
}

function normalizeRoutePath(filePath: string): string {
  const relative = path.relative(API_ROOT, filePath).replace(/\\/g, "/");
  const routePath = `/${relative.slice(0, -"/route.ts".length)}`;
  return routePath.replace(/\[([^\]]+)\]/g, "{$1}");
}

function collectFrontendPaths(): Set<string> {
  const files = listFiles(
    APP_ROOT,
    (filePath) =>
      /\.(ts|tsx)$/.test(filePath) &&
      !filePath.includes("/app/api/") &&
      !filePath.includes(".test."),
  );
  const result = new Set<string>();
  const patterns = [
    /fetch\(\s*(`[^`]*\/api\/[^`]*`|"[^"]*\/api\/[^"]*"|'[^']*\/api\/[^']*')/g,
    /submit\(\s*(`[^`]*\/api\/[^`]*`|"[^"]*\/api\/[^"]*"|'[^']*\/api\/[^']*')/g,
    /(endpoint|connectPath|disconnectPath)\s*:\s*(`[^`]*\/api\/[^`]*`|"[^"]*\/api\/[^"]*"|'[^']*\/api\/[^']*')/g,
  ];

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, "utf8");

    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        const rawValue = (match[2] ?? match[1])?.slice(1, -1);
        if (!rawValue?.startsWith("/api/")) {
          continue;
        }

        result.add(normalizeFrontendPath(rawValue));
      }
    }
  }

  return result;
}

function collectRouteOperations(): Map<string, Set<string>> {
  const routeFiles = listFiles(API_ROOT, (filePath) => filePath.endsWith("/route.ts"));
  const operations = new Map<string, Set<string>>();

  for (const filePath of routeFiles) {
    const routePath = normalizeRoutePath(filePath);
    const source = fs.readFileSync(filePath, "utf8");
    const methods = new Set<string>();

    for (const match of source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)/g)) {
      methods.add(match[1]);
    }

    operations.set(routePath, methods);
  }

  return operations;
}

function loadSpec(): OpenApiDocument {
  return JSON.parse(fs.readFileSync(SPEC_PATH, "utf8")) as OpenApiDocument;
}

describe("API spec drift guard", () => {
  it("documents every frontend-used API path", () => {
    const spec = loadSpec();
    const documentedPaths = new Set(Object.keys(spec.paths).map(normalizePathShape));
    const frontendPaths = collectFrontendPaths();
    const undocumentedPaths = [...frontendPaths].filter((routePath) => !documentedPaths.has(routePath));

    expect(undocumentedPaths).toEqual([]);
  });

  it("documents only implemented operations", () => {
    const spec = loadSpec();
    const routeOperations = collectRouteOperations();
    const missingOperations: string[] = [];

    for (const [routePath, operationMap] of Object.entries(spec.paths)) {
      const implementedMethods = routeOperations.get(routePath) ?? new Set<string>();
      const documentedMethods = Object.keys(operationMap)
        .filter((key) => ["get", "post", "put", "patch", "delete"].includes(key))
        .map((key) => key.toUpperCase());

      for (const method of documentedMethods) {
        if (!implementedMethods.has(method)) {
          missingOperations.push(`${method} ${routePath}`);
        }
      }
    }

    expect(missingOperations).toEqual([]);
  });
});
