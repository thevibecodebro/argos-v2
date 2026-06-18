export type WorkspaceThemeColors = {
  background: string;
  depth: string;
  surface: string;
  surfaceRaised: string;
  surfaceHigh: string;
  text: string;
  mutedText: string;
  border: string;
  borderStrong: string;
  primary: string;
  onPrimary: string;
  secondary: string;
  warning: string;
  success: string;
  danger: string;
  focus: string;
};

export type WorkspaceTheme = {
  version: 1;
  colors: WorkspaceThemeColors;
};

export type WorkspaceThemeParseResult =
  | { ok: true; data: WorkspaceTheme }
  | { ok: false; status: 400; error: string };

export type WorkspaceThemeContrastFailure = {
  field: keyof WorkspaceThemeColors;
  against: keyof WorkspaceThemeColors;
  minimumRatio: number;
  ratio: number;
};

type WorkspaceThemePreset =
  | {
      id: "argos" | "ocean" | "forest" | "violet" | "crimson";
      name: string;
      theme: WorkspaceTheme;
    }
  | {
      id: "custom";
      name: string;
    };

type WorkspaceThemePresetId = WorkspaceThemePreset["id"];

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;
const COLOR_FIELDS = [
  "background",
  "depth",
  "surface",
  "surfaceRaised",
  "surfaceHigh",
  "text",
  "mutedText",
  "border",
  "borderStrong",
  "primary",
  "onPrimary",
  "secondary",
  "warning",
  "success",
  "danger",
  "focus",
] as const satisfies readonly (keyof WorkspaceThemeColors)[];

const CONTRAST_RULES = [
  { field: "text", against: "background", minimumRatio: 4.5 },
  { field: "mutedText", against: "background", minimumRatio: 3 },
  { field: "onPrimary", against: "primary", minimumRatio: 4.5 },
  { field: "focus", against: "background", minimumRatio: 3 },
] as const satisfies readonly {
  field: keyof WorkspaceThemeColors;
  against: keyof WorkspaceThemeColors;
  minimumRatio: number;
}[];

export const DEFAULT_WORKSPACE_THEME = {
  version: 1,
  colors: {
    background: "#0C0B0A",
    depth: "#11100E",
    surface: "#151310",
    surfaceRaised: "#1B1814",
    surfaceHigh: "#231F19",
    text: "#F4EFE7",
    mutedText: "#AEABA5",
    border: "#262422",
    borderStrong: "#363432",
    primary: "#D8AA68",
    onPrimary: "#170D07",
    secondary: "#7FB8C7",
    warning: "#D98C58",
    success: "#8BC79D",
    danger: "#E06D64",
    focus: "#7FB8C7",
  },
} as const satisfies WorkspaceTheme;

export const WORKSPACE_THEME_PRESETS = {
  argos: {
    id: "argos",
    name: "Argos",
    theme: DEFAULT_WORKSPACE_THEME,
  },
  ocean: {
    id: "ocean",
    name: "Ocean",
    theme: createPresetTheme({
      background: "#071116",
      depth: "#0B1920",
      surface: "#10232B",
      surfaceRaised: "#16303A",
      surfaceHigh: "#1D3D49",
      text: "#EEF8FA",
      mutedText: "#A9C1C8",
      border: "#29454F",
      borderStrong: "#3C6471",
      primary: "#8FD0E0",
      onPrimary: "#061014",
      secondary: "#B6D98C",
      warning: "#E2B86B",
      success: "#86D6A3",
      danger: "#EF837C",
      focus: "#8FD0E0",
    }),
  },
  forest: {
    id: "forest",
    name: "Forest",
    theme: createPresetTheme({
      background: "#0A100B",
      depth: "#0E1710",
      surface: "#142016",
      surfaceRaised: "#1A2A1D",
      surfaceHigh: "#223526",
      text: "#F0F5EC",
      mutedText: "#B3C0AD",
      border: "#2E3F2F",
      borderStrong: "#465A45",
      primary: "#B8D47A",
      onPrimary: "#0C1207",
      secondary: "#75C7A2",
      warning: "#DCA35D",
      success: "#8DCC8D",
      danger: "#E27C72",
      focus: "#75C7A2",
    }),
  },
  violet: {
    id: "violet",
    name: "Violet",
    theme: createPresetTheme({
      background: "#100C15",
      depth: "#17101F",
      surface: "#1F172A",
      surfaceRaised: "#2A2037",
      surfaceHigh: "#362947",
      text: "#F5F0FA",
      mutedText: "#BDB0C9",
      border: "#443753",
      borderStrong: "#5D4C70",
      primary: "#C9A7F2",
      onPrimary: "#13091D",
      secondary: "#8FC9E6",
      warning: "#E1A166",
      success: "#8DD2A0",
      danger: "#E68080",
      focus: "#C9A7F2",
    }),
  },
  crimson: {
    id: "crimson",
    name: "Crimson",
    theme: createPresetTheme({
      background: "#150B0C",
      depth: "#1D0F11",
      surface: "#281618",
      surfaceRaised: "#351D20",
      surfaceHigh: "#45262A",
      text: "#FAF0EF",
      mutedText: "#C7ADAA",
      border: "#553537",
      borderStrong: "#70494C",
      primary: "#E58D7E",
      onPrimary: "#180807",
      secondary: "#E0BD76",
      warning: "#E4A05E",
      success: "#91CF98",
      danger: "#F08A88",
      focus: "#E0BD76",
    }),
  },
  custom: {
    id: "custom",
    name: "Custom",
  },
} as const satisfies Record<WorkspaceThemePresetId, WorkspaceThemePreset>;

function createPresetTheme(colors: WorkspaceThemeColors): WorkspaceTheme {
  return {
    version: 1,
    colors,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed.toUpperCase();
}

function roundContrastRatio(ratio: number) {
  return Math.round(ratio * 100) / 100;
}

function hexToRgb(hex: string) {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function getLinearChannelValue(value: number) {
  const channel = value / 255;

  if (channel <= 0.03928) {
    return channel / 12.92;
  }

  return ((channel + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);

  return (
    0.2126 * getLinearChannelValue(r) +
    0.7152 * getLinearChannelValue(g) +
    0.0722 * getLinearChannelValue(b)
  );
}

function getRawHexContrastRatio(firstHex: string, secondHex: string) {
  const firstLuminance = getRelativeLuminance(firstHex);
  const secondLuminance = getRelativeLuminance(secondHex);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

export function getHexContrastRatio(firstHex: string, secondHex: string) {
  return roundContrastRatio(getRawHexContrastRatio(firstHex, secondHex));
}

export function checkWorkspaceThemeContrast(
  theme: WorkspaceTheme,
): WorkspaceThemeContrastFailure[] {
  return CONTRAST_RULES.flatMap((rule) => {
    const ratio = getRawHexContrastRatio(
      theme.colors[rule.field],
      theme.colors[rule.against],
    );

    if (ratio >= rule.minimumRatio) {
      return [];
    }

    return [
      {
        field: rule.field,
        against: rule.against,
        minimumRatio: rule.minimumRatio,
        ratio: roundContrastRatio(ratio),
      },
    ];
  });
}

export function parseWorkspaceTheme(input: unknown): WorkspaceThemeParseResult {
  if (!isRecord(input)) {
    return { ok: false, status: 400, error: "Workspace theme payload must be an object" };
  }

  if (input.version !== undefined && input.version !== 1) {
    return { ok: false, status: 400, error: "workspace_theme.version must be 1" };
  }

  if (input.colors !== undefined && !isRecord(input.colors)) {
    return { ok: false, status: 400, error: "workspace_theme.colors must be an object" };
  }

  const inputColors = isRecord(input.colors) ? input.colors : {};
  const colors: WorkspaceThemeColors = { ...DEFAULT_WORKSPACE_THEME.colors };

  for (const field of COLOR_FIELDS) {
    const value = inputColors[field];

    if (value === undefined) {
      continue;
    }

    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return {
        ok: false,
        status: 400,
        error: `colors.${field} must be a #RRGGBB hex color`,
      };
    }

    colors[field] = normalized;
  }

  const theme = {
    version: 1,
    colors,
  } satisfies WorkspaceTheme;
  const contrastFailures = checkWorkspaceThemeContrast(theme);

  if (contrastFailures.length > 0) {
    const failure = contrastFailures[0];

    return {
      ok: false,
      status: 400,
      error: `colors.${failure.field} must have at least ${failure.minimumRatio}:1 contrast against colors.${failure.against}`,
    };
  }

  return { ok: true, data: theme };
}

export function coerceStoredWorkspaceTheme(input: unknown): WorkspaceTheme | null {
  if (input === null || input === undefined) {
    return null;
  }

  const parsed = parseWorkspaceTheme(input);

  return parsed.ok ? parsed.data : null;
}

export function workspaceThemeToForgeVars(theme: WorkspaceTheme) {
  return {
    "--forge-bg": theme.colors.background,
    "--forge-depth": theme.colors.depth,
    "--forge-surface": theme.colors.surface,
    "--forge-surface-2": theme.colors.surfaceRaised,
    "--forge-surface-3": theme.colors.surfaceHigh,
    "--forge-text": theme.colors.text,
    "--forge-muted": theme.colors.mutedText,
    "--forge-border": theme.colors.border,
    "--forge-border-strong": theme.colors.borderStrong,
    "--forge-gold": theme.colors.primary,
    "--forge-cyan": theme.colors.secondary,
    "--forge-ember": theme.colors.warning,
    "--forge-success": theme.colors.success,
    "--forge-danger": theme.colors.danger,
    "--forge-focus": theme.colors.focus,
    "--forge-on-accent": theme.colors.onPrimary,
  } satisfies Record<string, string>;
}
