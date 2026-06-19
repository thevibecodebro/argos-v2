import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKSPACE_THEME,
  WORKSPACE_THEME_PRESETS,
  checkWorkspaceThemeContrast,
  coerceStoredWorkspaceTheme,
  getHexContrastRatio,
  parseWorkspaceTheme,
  workspaceThemeToForgeVars,
  applyWorkspaceThemePreset,
} from "./workspace-theme";

describe("parseWorkspaceTheme", () => {
  it("fills missing color fields from Argos defaults, normalizes hex colors, and backfills light and dark modes", () => {
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
        activeMode: "dark",
        colors: {
          ...DEFAULT_WORKSPACE_THEME.colors,
          background: "#112233",
          primary: "#AA8844",
        },
        modes: {
          dark: {
            colors: {
              ...DEFAULT_WORKSPACE_THEME.modes.dark.colors,
              background: "#112233",
              primary: "#AA8844",
            },
            navigation: DEFAULT_WORKSPACE_THEME.modes.dark.navigation,
          },
          light: DEFAULT_WORKSPACE_THEME.modes.light,
        },
      },
    });
  });

  it("normalizes separate light, dark, left navigation, and top navigation colors", () => {
    const result = parseWorkspaceTheme({
      version: 1,
      activeMode: "light",
      modes: {
        dark: {
          colors: {
            background: "#080808",
            text: "#f8f8f8",
            primary: "#d8aa68",
            onPrimary: "#170d07",
            focus: "#8fd0e0",
          },
          navigation: {
            leftBackground: "#050505",
            leftText: "#f5f5f5",
            leftMutedText: "#a8a8a8",
            leftActiveBackground: "#2a2014",
            leftActiveText: "#f4c27a",
            leftBorder: "#303030",
            topBackground: "#090909",
            topText: "#f5f5f5",
            topMutedText: "#a8a8a8",
            topBorder: "#303030",
          },
        },
        light: {
          colors: {
            background: "#f8fafc",
            text: "#15202b",
            primary: "#1a5fb4",
            onPrimary: "#ffffff",
            focus: "#1a5fb4",
          },
          navigation: {
            leftBackground: "#ffffff",
            leftText: "#15202b",
            leftMutedText: "#546171",
            leftActiveBackground: "#dbeafe",
            leftActiveText: "#123f7d",
            leftBorder: "#cbd5e1",
            topBackground: "#f8fafc",
            topText: "#15202b",
            topMutedText: "#546171",
            topBorder: "#cbd5e1",
          },
        },
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        activeMode: "light",
        modes: {
          dark: {
            colors: {
              background: "#080808",
              text: "#F8F8F8",
            },
            navigation: {
              leftBackground: "#050505",
              topBackground: "#090909",
            },
          },
          light: {
            colors: {
              background: "#F8FAFC",
              text: "#15202B",
            },
            navigation: {
              leftBackground: "#FFFFFF",
              topBackground: "#F8FAFC",
            },
          },
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
  it("maps the active mode and navigation colors to forge CSS variable values", () => {
    const theme = {
      ...DEFAULT_WORKSPACE_THEME,
      activeMode: "light" as const,
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
      modes: {
        dark: DEFAULT_WORKSPACE_THEME.modes.dark,
        light: {
          colors: {
            ...DEFAULT_WORKSPACE_THEME.modes.light.colors,
            background: "#F8FAFC",
            depth: "#EEF2F7",
            surface: "#FFFFFF",
            surfaceRaised: "#F1F5F9",
            surfaceHigh: "#E2E8F0",
            text: "#172033",
            mutedText: "#536174",
            border: "#CBD5E1",
            borderStrong: "#94A3B8",
            primary: "#1A5FB4",
            onPrimary: "#FFFFFF",
            secondary: "#087990",
            warning: "#9A5B13",
            success: "#19724B",
            danger: "#B42318",
            focus: "#1A5FB4",
          },
          navigation: {
            leftBackground: "#FFFFFF",
            leftText: "#172033",
            leftMutedText: "#536174",
            leftActiveBackground: "#DBEAFE",
            leftActiveText: "#123F7D",
            leftBorder: "#CBD5E1",
            topBackground: "#F8FAFC",
            topText: "#172033",
            topMutedText: "#536174",
            topBorder: "#CBD5E1",
          },
        },
      },
    };

    expect(workspaceThemeToForgeVars(theme)).toMatchObject({
      "--forge-bg": "#F8FAFC",
      "--forge-depth": "#EEF2F7",
      "--forge-surface": "#FFFFFF",
      "--forge-surface-2": "#F1F5F9",
      "--forge-surface-3": "#E2E8F0",
      "--forge-text": "#172033",
      "--forge-muted": "#536174",
      "--forge-border": "#CBD5E1",
      "--forge-border-strong": "#94A3B8",
      "--forge-gold": "#1A5FB4",
      "--forge-cyan": "#087990",
      "--forge-ember": "#9A5B13",
      "--forge-success": "#19724B",
      "--forge-danger": "#B42318",
      "--forge-focus": "#1A5FB4",
      "--forge-on-accent": "#FFFFFF",
      "--forge-sidebar-bg": "#FFFFFF",
      "--forge-sidebar-text": "#172033",
      "--forge-sidebar-muted": "#536174",
      "--forge-sidebar-active-bg": "#DBEAFE",
      "--forge-sidebar-active-text": "#123F7D",
      "--forge-sidebar-border": "#CBD5E1",
      "--forge-topbar-bg": "#F8FAFC",
      "--forge-topbar-text": "#172033",
      "--forge-topbar-muted": "#536174",
      "--forge-topbar-border": "#CBD5E1",
      "--forge-panel-bg": "#FFFFFF",
      "--forge-panel-muted-bg": "#F1F5F9",
      "--forge-row-bg": "#F1F5F9",
      "--forge-field-bg": "#FFFFFF",
      "--forge-table-bg": "#FFFFFF",
      "--forge-table-header-bg": "#F1F5F9",
      "--forge-item-bg": "#F1F5F9",
      "--forge-item-selected-bg": "#DBEAFE",
      "--forge-control-bg": "#F1F5F9",
      "--forge-transcript-bg": "#FFFFFF",
      "--forge-bubble-bg": "#F1F5F9",
      "--forge-floating-bg": "#FFFFFF",
      "--forge-secondary-rail-bg": "#FFFFFF",
      "--forge-secondary-rail-text": "#172033",
      "--forge-secondary-rail-active-bg": "#DBEAFE",
      "--forge-secondary-rail-active-text": "#123F7D",
    });
  });

  it("emits light semantic resources for the Mist starter template", () => {
    const mistTheme = {
      ...WORKSPACE_THEME_PRESETS.mist.theme,
      activeMode: "light" as const,
    };

    expect(workspaceThemeToForgeVars(mistTheme)).toMatchObject({
      "--forge-bg": "#F3F7F8",
      "--forge-panel-bg": "#FFFFFF",
      "--forge-panel-muted-bg": "#EEF4F6",
      "--forge-row-bg": "#EEF4F6",
      "--forge-field-bg": "#FFFFFF",
      "--forge-table-bg": "#FFFFFF",
      "--forge-table-header-bg": "#EEF4F6",
      "--forge-item-bg": "#EEF4F6",
      "--forge-item-selected-bg": "#EEF4F6",
      "--forge-control-bg": "#EEF4F6",
      "--forge-transcript-bg": "#FFFFFF",
      "--forge-bubble-bg": "#EEF4F6",
      "--forge-floating-bg": "#FFFFFF",
      "--forge-secondary-rail-bg": "#FFFFFF",
      "--forge-secondary-rail-text": "#18313A",
      "--forge-secondary-rail-active-bg": "#EEF4F6",
      "--forge-secondary-rail-active-text": "#176B87",
    });

    expect(workspaceThemeToForgeVars(mistTheme)["--forge-panel-bg"]).not.toBe("#050403");
    expect(workspaceThemeToForgeVars(mistTheme)["--forge-secondary-rail-bg"]).not.toBe("#050403");
  });
});

describe("applyWorkspaceThemePreset", () => {
  it("applies light starter templates as the active saved workspace mode", () => {
    const nextTheme = applyWorkspaceThemePreset(
      DEFAULT_WORKSPACE_THEME,
      "mist",
    );

    expect(nextTheme.activeMode).toBe("light");
    expect(nextTheme.modes.light.colors.background).toBe("#F3F7F8");
    expect(nextTheme.colors).toEqual(nextTheme.modes.dark.colors);
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
    ).toMatchObject({
      version: 1,
      activeMode: "dark",
      modes: {
        dark: {
          colors: {
            ...DEFAULT_WORKSPACE_THEME.modes.dark.colors,
            primary: "#AA8844",
          },
        },
        light: DEFAULT_WORKSPACE_THEME.modes.light,
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
      modes: {
        ...DEFAULT_WORKSPACE_THEME.modes,
        dark: {
          ...DEFAULT_WORKSPACE_THEME.modes.dark,
          colors: {
            ...DEFAULT_WORKSPACE_THEME.modes.dark.colors,
            background: "#101010",
            text: "#222222",
            mutedText: "#333333",
            primary: "#EEEEEE",
            onPrimary: "#FFFFFF",
            focus: "#252525",
          },
        },
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
  it("includes Argos defaults and starter templates for dark and light modes", () => {
    expect(WORKSPACE_THEME_PRESETS.argos.theme).toEqual(DEFAULT_WORKSPACE_THEME);
    expect(WORKSPACE_THEME_PRESETS.ocean.mode).toBe("dark");
    expect(WORKSPACE_THEME_PRESETS.daylight.mode).toBe("light");
    expect(WORKSPACE_THEME_PRESETS.mist.mode).toBe("light");
    expect(WORKSPACE_THEME_PRESETS.custom).toEqual({
      id: "custom",
      name: "Custom",
    });
  });
});
