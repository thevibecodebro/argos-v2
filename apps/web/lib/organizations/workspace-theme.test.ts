import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKSPACE_THEME,
  WORKSPACE_THEME_PRESETS,
  checkWorkspaceThemeContrast,
  coerceStoredWorkspaceTheme,
  getHexContrastRatio,
  parseWorkspaceTheme,
  workspaceThemeToForgeVars,
} from "./workspace-theme";

describe("parseWorkspaceTheme", () => {
  it("fills missing color fields from Argos defaults and normalizes hex colors", () => {
    const result = parseWorkspaceTheme({
      version: 1,
      colors: {
        background: "#112233",
        primary: "#aa8844",
      },
    });

    expect(result).toEqual({
      ok: true,
      data: {
        version: 1,
        colors: {
          ...DEFAULT_WORKSPACE_THEME.colors,
          background: "#112233",
          primary: "#AA8844",
        },
      },
    });
  });

  it("rejects non-RRGGBB hex color values", () => {
    const result = parseWorkspaceTheme({
      version: 1,
      colors: {
        background: "#123",
      },
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "colors.background must be a #RRGGBB hex color",
    });
  });

  it("rejects low body text contrast against the background", () => {
    const result = parseWorkspaceTheme({
      version: 1,
      colors: {
        background: "#101010",
        text: "#222222",
      },
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "colors.text must have at least 4.5:1 contrast against colors.background",
    });
  });

  it("rejects low muted text contrast against the background", () => {
    const result = parseWorkspaceTheme({
      version: 1,
      colors: {
        background: "#101010",
        mutedText: "#333333",
      },
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "colors.mutedText must have at least 3:1 contrast against colors.background",
    });
  });

  it("rejects low on-primary contrast against the primary color", () => {
    const result = parseWorkspaceTheme({
      version: 1,
      colors: {
        onPrimary: "#FFFFFF",
        primary: "#EEEEEE",
      },
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "colors.onPrimary must have at least 4.5:1 contrast against colors.primary",
    });
  });

  it("rejects colors that only meet contrast after rounded display", () => {
    const result = parseWorkspaceTheme({
      version: 1,
      colors: {
        onPrimary: "#FFFFFF",
        primary: "#006FFB",
      },
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "colors.onPrimary must have at least 4.5:1 contrast against colors.primary",
    });
  });

  it("rejects low focus contrast against the background", () => {
    const result = parseWorkspaceTheme({
      version: 1,
      colors: {
        background: "#101010",
        focus: "#252525",
      },
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      error: "colors.focus must have at least 3:1 contrast against colors.background",
    });
  });
});

describe("workspaceThemeToForgeVars", () => {
  it("maps a valid workspace theme to forge CSS variable values", () => {
    const theme = {
      ...DEFAULT_WORKSPACE_THEME,
      colors: {
        ...DEFAULT_WORKSPACE_THEME.colors,
        background: "#102030",
        depth: "#112233",
        surface: "#223344",
        surfaceRaised: "#334455",
        surfaceHigh: "#445566",
        text: "#FDFDFD",
        mutedText: "#B8C0C8",
        border: "#556677",
        borderStrong: "#667788",
        primary: "#E0B060",
        onPrimary: "#160D06",
        secondary: "#80C0D0",
        warning: "#D99050",
        success: "#90CCAA",
        danger: "#E07070",
        focus: "#8DD6FF",
      },
    };

    expect(workspaceThemeToForgeVars(theme)).toEqual({
      "--forge-bg": "#102030",
      "--forge-depth": "#112233",
      "--forge-surface": "#223344",
      "--forge-surface-2": "#334455",
      "--forge-surface-3": "#445566",
      "--forge-text": "#FDFDFD",
      "--forge-muted": "#B8C0C8",
      "--forge-border": "#556677",
      "--forge-border-strong": "#667788",
      "--forge-gold": "#E0B060",
      "--forge-cyan": "#80C0D0",
      "--forge-ember": "#D99050",
      "--forge-success": "#90CCAA",
      "--forge-danger": "#E07070",
      "--forge-focus": "#8DD6FF",
      "--forge-on-accent": "#160D06",
    });
  });
});

describe("coerceStoredWorkspaceTheme", () => {
  it("normalizes valid stored theme JSON and ignores invalid stored values", () => {
    expect(
      coerceStoredWorkspaceTheme({
        version: 1,
        colors: {
          primary: "#aa8844",
        },
      }),
    ).toEqual({
      version: 1,
      colors: {
        ...DEFAULT_WORKSPACE_THEME.colors,
        primary: "#AA8844",
      },
    });
    expect(coerceStoredWorkspaceTheme(null)).toBeNull();
    expect(coerceStoredWorkspaceTheme({ version: 2, colors: {} })).toBeNull();
  });
});

describe("workspace theme contrast helpers", () => {
  it("calculates WCAG contrast ratios for hex colors", () => {
    expect(getHexContrastRatio("#000000", "#FFFFFF")).toBe(21);
    expect(getHexContrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
  });

  it("returns all required contrast failures for UI validation", () => {
    const failures = checkWorkspaceThemeContrast({
      ...DEFAULT_WORKSPACE_THEME,
      colors: {
        ...DEFAULT_WORKSPACE_THEME.colors,
        background: "#101010",
        text: "#222222",
        mutedText: "#333333",
        primary: "#EEEEEE",
        onPrimary: "#FFFFFF",
        focus: "#252525",
      },
    });

    expect(failures).toEqual([
      {
        field: "text",
        against: "background",
        minimumRatio: 4.5,
        ratio: expect.any(Number),
      },
      {
        field: "mutedText",
        against: "background",
        minimumRatio: 3,
        ratio: expect.any(Number),
      },
      {
        field: "onPrimary",
        against: "primary",
        minimumRatio: 4.5,
        ratio: expect.any(Number),
      },
      {
        field: "focus",
        against: "background",
        minimumRatio: 3,
        ratio: expect.any(Number),
      },
    ]);
  });
});

describe("WORKSPACE_THEME_PRESETS", () => {
  it("includes Argos defaults and a metadata-only Custom preset", () => {
    expect(WORKSPACE_THEME_PRESETS.argos.theme).toEqual(DEFAULT_WORKSPACE_THEME);
    expect(WORKSPACE_THEME_PRESETS.custom).toEqual({
      id: "custom",
      name: "Custom",
    });
  });
});
