import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { interMock, geistMonoMock, geistMock, sourceSansMock, spaceGroteskMock } =
  vi.hoisted(() => ({
    interMock: vi.fn(() => ({ variable: "font-ui-variable" })),
    geistMonoMock: vi.fn(() => ({ variable: "font-mono-variable" })),
    geistMock: vi.fn(() => ({ variable: "font-geist-variable" })),
    sourceSansMock: vi.fn(() => ({ variable: "font-body-variable" })),
    spaceGroteskMock: vi.fn(() => ({ variable: "font-display-variable" })),
  }));

vi.mock("next/font/google", () => ({
  Inter: interMock,
  Geist_Mono: geistMonoMock,
  Geist: geistMock,
  Source_Sans_3: sourceSansMock,
  Space_Grotesk: spaceGroteskMock,
}));

vi.mock("@/lib/env", () => ({
  getDevelopmentStartupEnvError: () => null,
}));

import RootLayout from "../app/layout";

const webRoot = join(import.meta.dirname, "..");

describe("authenticated typography contract", () => {
  it("loads Inter for UI surfaces and Geist Mono for tabular numerals", () => {
    const html = renderToStaticMarkup(
      createElement(
        RootLayout,
        null,
        createElement("main", null, "Backend page"),
      ),
    );

    expect(interMock).toHaveBeenCalledWith(
      expect.objectContaining({
        display: "swap",
        subsets: ["latin"],
        variable: "--font-ui",
      }),
    );
    expect(geistMonoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        display: "swap",
        subsets: ["latin"],
        variable: "--font-mono",
      }),
    );
    expect(geistMock).not.toHaveBeenCalled();
    expect(spaceGroteskMock).not.toHaveBeenCalled();
    expect(sourceSansMock).not.toHaveBeenCalled();
    expect(html).toContain("font-ui-variable");
    expect(html).toContain("font-mono-variable");
    expect(html).not.toContain("font-display-variable");
    expect(html).not.toContain("font-body-variable");
  });

  it("keeps authenticated typography on the UI font with a wired numeric font", () => {
    const globals = readFileSync(join(webRoot, "app/globals.css"), "utf8");
    const roleplayPanel = readFileSync(
      join(webRoot, "components/roleplay-panel.tsx"),
      "utf8",
    );

    expect(globals).toContain(
      "--font-display: var(--font-ui, var(--font-sans-fallback));",
    );
    expect(globals).toContain(
      "--font-body: var(--font-ui, var(--font-sans-fallback));",
    );
    expect(globals).toContain(
      "--font-numeric: var(--font-mono, var(--font-mono-fallback));",
    );
    expect(globals).not.toContain('--font-display: "Space Grotesk"');
    expect(globals).not.toContain('--font-body: "Source Sans 3"');
    expect(roleplayPanel).not.toContain("font-['Space_Grotesk']");
  });
});
