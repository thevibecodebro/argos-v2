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

export type WorkspaceThemeMode = "dark" | "light";

export type WorkspaceNavigationTheme = {
  leftBackground: string;
  leftText: string;
  leftMutedText: string;
  leftActiveBackground: string;
  leftActiveText: string;
  leftBorder: string;
  topBackground: string;
  topText: string;
  topMutedText: string;
  topBorder: string;
};

export type WorkspaceThemeModeConfig = {
  colors: WorkspaceThemeColors;
  navigation: WorkspaceNavigationTheme;
};

export type WorkspaceTheme = {
  version: 1;
  activeMode: WorkspaceThemeMode;
  colors: WorkspaceThemeColors;
  modes: Record<WorkspaceThemeMode, WorkspaceThemeModeConfig>;
};

export type WorkspaceThemeParseResult =
  | { ok: true; data: WorkspaceTheme }
  | { ok: false; status: 400; error: string };

export type WorkspaceThemeContrastFailure = {
  field: keyof WorkspaceThemeColors | keyof WorkspaceNavigationTheme;
  against: keyof WorkspaceThemeColors | keyof WorkspaceNavigationTheme;
  minimumRatio: number;
  ratio: number;
};

type WorkspaceThemePreset =
  | {
      id:
        | "argos"
        | "ocean"
        | "forest"
        | "violet"
        | "crimson"
        | "daylight"
        | "mist"
        | "sage";
      mode: WorkspaceThemeMode;
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

const NAVIGATION_FIELDS = [
  "leftBackground",
  "leftText",
  "leftMutedText",
  "leftActiveBackground",
  "leftActiveText",
  "leftBorder",
  "topBackground",
  "topText",
  "topMutedText",
  "topBorder",
] as const satisfies readonly (keyof WorkspaceNavigationTheme)[];

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

const NAVIGATION_CONTRAST_RULES = [
  { field: "leftText", against: "leftBackground", minimumRatio: 4.5 },
  { field: "leftMutedText", against: "leftBackground", minimumRatio: 3 },
  { field: "leftActiveText", against: "leftActiveBackground", minimumRatio: 4.5 },
  { field: "topText", against: "topBackground", minimumRatio: 4.5 },
  { field: "topMutedText", against: "topBackground", minimumRatio: 3 },
] as const satisfies readonly {
  field: keyof WorkspaceNavigationTheme;
  against: keyof WorkspaceNavigationTheme;
  minimumRatio: number;
}[];

const DEFAULT_DARK_COLORS = {
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
} as const satisfies WorkspaceThemeColors;

const DEFAULT_LIGHT_COLORS = {
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
} as const satisfies WorkspaceThemeColors;

const DEFAULT_DARK_NAVIGATION = {
  leftBackground: "#11100E",
  leftText: "#F4EFE7",
  leftMutedText: "#AEABA5",
  leftActiveBackground: "#2A2116",
  leftActiveText: "#D8AA68",
  leftBorder: "#262422",
  topBackground: "#080706",
  topText: "#F4EFE7",
  topMutedText: "#AEABA5",
  topBorder: "#262422",
} as const satisfies WorkspaceNavigationTheme;

const DEFAULT_LIGHT_NAVIGATION = {
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
} as const satisfies WorkspaceNavigationTheme;

export const DEFAULT_WORKSPACE_THEME = {
  version: 1,
  activeMode: "dark",
  colors: DEFAULT_DARK_COLORS,
  modes: {
    dark: {
      colors: DEFAULT_DARK_COLORS,
      navigation: DEFAULT_DARK_NAVIGATION,
    },
    light: {
      colors: DEFAULT_LIGHT_COLORS,
      navigation: DEFAULT_LIGHT_NAVIGATION,
    },
  },
} as const satisfies WorkspaceTheme;

export const WORKSPACE_THEME_PRESETS = {
  argos: {
    id: "argos",
    mode: "dark",
    name: "Argos",
    theme: DEFAULT_WORKSPACE_THEME,
  },
  ocean: {
    id: "ocean",
    mode: "dark",
    name: "Ocean",
    theme: createPresetTheme("dark", {
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
    mode: "dark",
    name: "Forest",
    theme: createPresetTheme("dark", {
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
    mode: "dark",
    name: "Violet",
    theme: createPresetTheme("dark", {
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
    mode: "dark",
    name: "Crimson",
    theme: createPresetTheme("dark", {
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
  daylight: {
    id: "daylight",
    mode: "light",
    name: "Daylight",
    theme: createPresetTheme("light", DEFAULT_LIGHT_COLORS),
  },
  mist: {
    id: "mist",
    mode: "light",
    name: "Mist",
    theme: createPresetTheme("light", {
      background: "#F3F7F8",
      depth: "#E8EFF1",
      surface: "#FFFFFF",
      surfaceRaised: "#EEF4F6",
      surfaceHigh: "#DDE8EC",
      text: "#18313A",
      mutedText: "#536C75",
      border: "#C8D6DB",
      borderStrong: "#91A7B0",
      primary: "#176B87",
      onPrimary: "#FFFFFF",
      secondary: "#4E7D65",
      warning: "#9C6418",
      success: "#1D734E",
      danger: "#B3261E",
      focus: "#176B87",
    }),
  },
  sage: {
    id: "sage",
    mode: "light",
    name: "Sage",
    theme: createPresetTheme("light", {
      background: "#F6F8F1",
      depth: "#EAEFE1",
      surface: "#FFFFFF",
      surfaceRaised: "#F0F4EA",
      surfaceHigh: "#E1E9D8",
      text: "#1F2D1F",
      mutedText: "#5C6A58",
      border: "#CDD8C4",
      borderStrong: "#95A58C",
      primary: "#436A2F",
      onPrimary: "#FFFFFF",
      secondary: "#1B7562",
      warning: "#8F621D",
      success: "#287044",
      danger: "#A7352B",
      focus: "#436A2F",
    }),
  },
  custom: {
    id: "custom",
    name: "Custom",
  },
} as const satisfies Record<WorkspaceThemePresetId, WorkspaceThemePreset>;

function createNavigationFromColors(
  mode: WorkspaceThemeMode,
  colors: WorkspaceThemeColors,
): WorkspaceNavigationTheme {
  if (mode === "light") {
    return {
      ...DEFAULT_LIGHT_NAVIGATION,
      leftBackground: colors.surface,
      leftText: colors.text,
      leftMutedText: colors.mutedText,
      leftActiveBackground: colors.surfaceRaised,
      leftActiveText: colors.primary,
      leftBorder: colors.border,
      topBackground: colors.background,
      topText: colors.text,
      topMutedText: colors.mutedText,
      topBorder: colors.border,
    };
  }

  return {
    ...DEFAULT_DARK_NAVIGATION,
    leftBackground: colors.depth,
    leftText: colors.text,
    leftMutedText: colors.mutedText,
    leftActiveText: colors.primary,
    leftBorder: colors.border,
    topText: colors.text,
    topMutedText: colors.mutedText,
    topBorder: colors.border,
  };
}

function createPresetTheme(
  mode: WorkspaceThemeMode,
  colors: WorkspaceThemeColors,
): WorkspaceTheme {
  const modeConfig = {
    colors,
    navigation: createNavigationFromColors(mode, colors),
  };
  const modes = {
    ...DEFAULT_WORKSPACE_THEME.modes,
    [mode]: modeConfig,
  };

  return {
    version: 1,
    activeMode: mode,
    colors: modes.dark.colors,
    modes,
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
  mode: WorkspaceThemeMode = theme.activeMode,
): WorkspaceThemeContrastFailure[] {
  const modeTheme = theme.modes[mode] ?? theme.modes.dark;
  const colorFailures = CONTRAST_RULES.flatMap((rule) => {
    const ratio = getRawHexContrastRatio(
      modeTheme.colors[rule.field],
      modeTheme.colors[rule.against],
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
  const navigationFailures = NAVIGATION_CONTRAST_RULES.flatMap((rule) => {
    const ratio = getRawHexContrastRatio(
      modeTheme.navigation[rule.field],
      modeTheme.navigation[rule.against],
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

  return [...colorFailures, ...navigationFailures];
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

  if (input.modes !== undefined && !isRecord(input.modes)) {
    return { ok: false, status: 400, error: "workspace_theme.modes must be an object" };
  }

  const activeMode: WorkspaceThemeMode = input.activeMode === "light" ? "light" : "dark";
  const legacyColors = normalizeColors(
    DEFAULT_WORKSPACE_THEME.modes.dark.colors,
    isRecord(input.colors) ? input.colors : {},
    "colors",
  );

  if (!legacyColors.ok) {
    return legacyColors;
  }

  const inputModes = isRecord(input.modes) ? input.modes : {};
  const dark = parseThemeMode(
    "dark",
    inputModes.dark,
    legacyColors.colors,
    DEFAULT_WORKSPACE_THEME.modes.dark.navigation,
  );

  if (!dark.ok) {
    return dark;
  }

  const light = parseThemeMode(
    "light",
    inputModes.light,
    DEFAULT_WORKSPACE_THEME.modes.light.colors,
    DEFAULT_WORKSPACE_THEME.modes.light.navigation,
  );

  if (!light.ok) {
    return light;
  }

  const theme = {
    version: 1,
    activeMode,
    colors: dark.config.colors,
    modes: {
      dark: dark.config,
      light: light.config,
    },
  } satisfies WorkspaceTheme;
  const contrastFailures = checkWorkspaceThemeContrast(theme, "dark");
  contrastFailures.push(...checkWorkspaceThemeContrast(theme, "light"));

  if (contrastFailures.length > 0) {
    const failure = contrastFailures[0];

    return {
      ok: false,
      status: 400,
      error: `${getContrastFieldPath(failure.field)} must have at least ${failure.minimumRatio}:1 contrast against ${getContrastFieldPath(failure.against)}`,
    };
  }

  return { ok: true, data: theme };
}

function getContrastFieldPath(
  field: keyof WorkspaceThemeColors | keyof WorkspaceNavigationTheme,
) {
  return (COLOR_FIELDS as readonly string[]).includes(field)
    ? `colors.${field}`
    : `navigation.${field}`;
}

function normalizeColors(
  defaults: WorkspaceThemeColors,
  inputColors: Record<string, unknown>,
  path: string,
): { ok: true; colors: WorkspaceThemeColors } | { ok: false; status: 400; error: string } {
  const colors: WorkspaceThemeColors = { ...defaults };

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
        error: `${path}.${field} must be a #RRGGBB hex color`,
      };
    }

    colors[field] = normalized;
  }

  return { ok: true, colors };
}

function normalizeNavigation(
  defaults: WorkspaceNavigationTheme,
  inputNavigation: Record<string, unknown>,
  path: string,
): { ok: true; navigation: WorkspaceNavigationTheme } | { ok: false; status: 400; error: string } {
  const navigation: WorkspaceNavigationTheme = { ...defaults };

  for (const field of NAVIGATION_FIELDS) {
    const value = inputNavigation[field];

    if (value === undefined) {
      continue;
    }

    const normalized = normalizeHexColor(value);

    if (!normalized) {
      return {
        ok: false,
        status: 400,
        error: `${path}.${field} must be a #RRGGBB hex color`,
      };
    }

    navigation[field] = normalized;
  }

  return { ok: true, navigation };
}

function parseThemeMode(
  mode: WorkspaceThemeMode,
  input: unknown,
  defaultColors: WorkspaceThemeColors,
  defaultNavigation: WorkspaceNavigationTheme,
): { ok: true; config: WorkspaceThemeModeConfig } | { ok: false; status: 400; error: string } {
  if (input !== undefined && !isRecord(input)) {
    return {
      ok: false,
      status: 400,
      error: `workspace_theme.modes.${mode} must be an object`,
    };
  }

  const inputMode = isRecord(input) ? input : {};

  if (inputMode.colors !== undefined && !isRecord(inputMode.colors)) {
    return {
      ok: false,
      status: 400,
      error: `workspace_theme.modes.${mode}.colors must be an object`,
    };
  }

  if (inputMode.navigation !== undefined && !isRecord(inputMode.navigation)) {
    return {
      ok: false,
      status: 400,
      error: `workspace_theme.modes.${mode}.navigation must be an object`,
    };
  }

  const colors = normalizeColors(
    defaultColors,
    isRecord(inputMode.colors) ? inputMode.colors : {},
    `modes.${mode}.colors`,
  );

  if (!colors.ok) {
    return colors;
  }

  const navigation = normalizeNavigation(
    defaultNavigation,
    isRecord(inputMode.navigation) ? inputMode.navigation : {},
    `modes.${mode}.navigation`,
  );

  if (!navigation.ok) {
    return navigation;
  }

  return {
    ok: true,
    config: {
      colors: colors.colors,
      navigation: navigation.navigation,
    },
  };
}

export function coerceStoredWorkspaceTheme(input: unknown): WorkspaceTheme | null {
  if (input === null || input === undefined) {
    return null;
  }

  const parsed = parseWorkspaceTheme(input);

  return parsed.ok ? parsed.data : null;
}

export function applyWorkspaceThemePreset(
  currentTheme: WorkspaceTheme,
  presetKey: keyof typeof WORKSPACE_THEME_PRESETS,
): WorkspaceTheme {
  const preset = WORKSPACE_THEME_PRESETS[presetKey];

  if (!("theme" in preset)) {
    return currentTheme;
  }

  if (preset.id === "argos") {
    return DEFAULT_WORKSPACE_THEME;
  }

  const presetModeTheme = preset.theme.modes[preset.mode];
  const modes = {
    ...currentTheme.modes,
    [preset.mode]: presetModeTheme,
  };

  return {
    ...currentTheme,
    activeMode: preset.mode,
    colors: modes.dark.colors,
    modes,
  };
}

export function workspaceThemeToForgeVars(theme: WorkspaceTheme) {
  const modeTheme = theme.modes[theme.activeMode] ?? theme.modes.dark;
  const colors = modeTheme.colors;
  const navigation = modeTheme.navigation;

  return {
    "--forge-bg": colors.background,
    "--forge-depth": colors.depth,
    "--forge-surface": colors.surface,
    "--forge-surface-2": colors.surfaceRaised,
    "--forge-surface-3": colors.surfaceHigh,
    "--forge-text": colors.text,
    "--forge-muted": colors.mutedText,
    "--forge-border": colors.border,
    "--forge-border-strong": colors.borderStrong,
    "--forge-gold": colors.primary,
    "--forge-cyan": colors.secondary,
    "--forge-ember": colors.warning,
    "--forge-success": colors.success,
    "--forge-danger": colors.danger,
    "--forge-focus": colors.focus,
    "--forge-on-accent": colors.onPrimary,
    "--forge-sidebar-bg": navigation.leftBackground,
    "--forge-sidebar-text": navigation.leftText,
    "--forge-sidebar-muted": navigation.leftMutedText,
    "--forge-sidebar-active-bg": navigation.leftActiveBackground,
    "--forge-sidebar-active-text": navigation.leftActiveText,
    "--forge-sidebar-border": navigation.leftBorder,
    "--forge-topbar-bg": navigation.topBackground,
    "--forge-topbar-text": navigation.topText,
    "--forge-topbar-muted": navigation.topMutedText,
    "--forge-topbar-border": navigation.topBorder,
    "--forge-panel-bg": colors.surface,
    "--forge-panel-muted-bg": colors.surfaceRaised,
    "--forge-panel-strong-bg": colors.surfaceHigh,
    "--forge-row-bg": colors.surfaceRaised,
    "--forge-field-bg": colors.surface,
    "--forge-workspace-rail-bg": colors.surface,
    "--forge-secondary-rail-bg": navigation.leftBackground,
    "--forge-secondary-rail-text": navigation.leftText,
    "--forge-secondary-rail-muted": navigation.leftMutedText,
    "--forge-secondary-rail-active-bg": navigation.leftActiveBackground,
    "--forge-secondary-rail-active-text": navigation.leftActiveText,
    "--forge-secondary-rail-border": navigation.leftBorder,
    "--forge-overlay-bg": "color-mix(in srgb, var(--forge-bg) 72%, transparent)",
  } satisfies Record<string, string>;
}
