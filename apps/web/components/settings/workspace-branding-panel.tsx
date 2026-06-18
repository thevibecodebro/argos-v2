"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ForgeIcon } from "@/components/forge";
import {
  DEFAULT_WORKSPACE_THEME,
  WORKSPACE_THEME_PRESETS,
  checkWorkspaceThemeContrast,
  parseWorkspaceTheme,
  workspaceThemeToForgeVars,
  type WorkspaceTheme,
  type WorkspaceThemeColors,
} from "@/lib/organizations/workspace-theme";

type WorkspaceBrandingPanelProps = {
  initialTheme: WorkspaceTheme | null;
  organizationName: string;
};

type ColorField = keyof WorkspaceThemeColors;

type ColorControl = {
  description: string;
  field: ColorField;
  label: string;
};

const RESTORE_CONFIRMATION_COPY =
  "This will remove custom colors and return this workspace to the Argos default theme. Your logo, users, calls, billing, and settings will not change.";

const QUICK_COLORS: ColorControl[] = [
  { field: "background", label: "Background", description: "Main workspace backdrop." },
  { field: "surface", label: "Surface", description: "Cards and panels." },
  { field: "primary", label: "Primary action", description: "Buttons and active states." },
  { field: "onPrimary", label: "Button text", description: "Text on primary actions." },
  { field: "text", label: "Text", description: "Primary readable text." },
  { field: "mutedText", label: "Muted text", description: "Secondary labels." },
];

const ADVANCED_COLORS: ColorControl[] = [
  { field: "depth", label: "Depth", description: "Navigation and recessed areas." },
  { field: "surfaceRaised", label: "Raised surface", description: "Elevated controls." },
  { field: "surfaceHigh", label: "High surface", description: "Menus and overlays." },
  { field: "border", label: "Border", description: "Default dividers." },
  { field: "borderStrong", label: "Strong border", description: "Emphasis dividers." },
  { field: "secondary", label: "Secondary", description: "Informational accents." },
  { field: "warning", label: "Warning", description: "Warning states." },
  { field: "success", label: "Success", description: "Positive states." },
  { field: "danger", label: "Danger", description: "Destructive states." },
  { field: "focus", label: "Focus", description: "Keyboard focus ring." },
];

function getInitialColors(theme: WorkspaceTheme | null) {
  return theme?.colors ?? DEFAULT_WORKSPACE_THEME.colors;
}

function getColorInputValue(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
}

export function WorkspaceBrandingPanel({
  initialTheme,
  organizationName,
}: WorkspaceBrandingPanelProps) {
  const router = useRouter();
  const [savedTheme, setSavedTheme] = useState<WorkspaceTheme | null>(initialTheme);
  const [colors, setColors] = useState<Record<ColorField, string>>(
    getInitialColors(initialTheme),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const parsedTheme = useMemo(
    () => parseWorkspaceTheme({ version: 1, colors }),
    [colors],
  );
  const previewTheme = parsedTheme.ok ? parsedTheme.data : DEFAULT_WORKSPACE_THEME;
  const contrastFailures = parsedTheme.ok
    ? checkWorkspaceThemeContrast(previewTheme)
    : [];
  const isDirty =
    JSON.stringify(colors) !== JSON.stringify(getInitialColors(savedTheme));

  function updateColor(field: ColorField, value: string) {
    setMessage(null);
    setColors((current) => ({
      ...current,
      [field]: value.toUpperCase(),
    }));
  }

  function selectPreset(presetKey: keyof typeof WORKSPACE_THEME_PRESETS) {
    const preset = WORKSPACE_THEME_PRESETS[presetKey];

    if ("theme" in preset) {
      setColors(preset.theme.colors);
      setMessage(`${preset.name} palette previewing.`);
    } else {
      setMessage("Custom palette ready.");
    }
  }

  function cancelChanges() {
    setColors(getInitialColors(savedTheme));
    setMessage("Changes discarded.");
  }

  async function saveChanges() {
    if (!parsedTheme.ok) {
      setMessage(parsedTheme.error);
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/organizations/branding", {
        body: JSON.stringify(parsedTheme.data),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save workspace branding.");
      }

      const nextTheme = payload.org?.workspaceTheme ?? parsedTheme.data;
      setSavedTheme(nextTheme);
      setColors(nextTheme.colors);
      setMessage("Workspace branding saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save workspace branding.");
    } finally {
      setIsSaving(false);
    }
  }

  async function restoreDefaults() {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/organizations/branding", {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to restore workspace branding.");
      }

      setSavedTheme(null);
      setColors(DEFAULT_WORKSPACE_THEME.colors);
      setIsRestoreOpen(false);
      setMessage("Workspace branding restored to Argos defaults.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to restore workspace branding.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-w-0" data-workspace-branding-panel="true">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <aside className="order-1 space-y-3 xl:sticky xl:top-20 xl:order-2 xl:self-start">
          <ThemePreview
            organizationName={organizationName}
            theme={previewTheme}
            validationMessage={parsedTheme.ok ? null : parsedTheme.error}
          />
          <ValidationPanel
            contrastFailures={contrastFailures}
            validationMessage={parsedTheme.ok ? null : parsedTheme.error}
          />
        </aside>

        <section className="order-2 min-w-0 space-y-3 xl:order-1">
          <section className="rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_2.6%,transparent)] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--forge-text)]">
                  Quick palettes
                </h2>
                <p className="mt-1 text-xs leading-5 text-[var(--forge-muted)]">
                  Pick a starting point, then adjust only what you need.
                </p>
              </div>
              <button
                className="forge-button forge-button-ghost forge-focus-ring min-h-9 rounded-lg px-3 py-2 text-xs"
                onClick={() => setIsRestoreOpen(true)}
                type="button"
              >
                <ForgeIcon name="restart_alt" size={15} />
                Restore
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(WORKSPACE_THEME_PRESETS) as Array<keyof typeof WORKSPACE_THEME_PRESETS>).map(
                (presetKey) => {
                  const preset = WORKSPACE_THEME_PRESETS[presetKey];
                  const swatchTheme =
                    "theme" in preset ? preset.theme : DEFAULT_WORKSPACE_THEME;

                  return (
                    <button
                      className="forge-focus-ring rounded-lg border border-[var(--forge-border)] bg-[var(--forge-surface)] p-2 text-left transition hover:border-[color-mix(in_srgb,var(--forge-gold)_44%,transparent)]"
                      data-branding-preset={preset.id}
                      key={preset.id}
                      onClick={() => selectPreset(presetKey)}
                      type="button"
                    >
                      <span className="flex h-8 overflow-hidden rounded-md border border-[var(--forge-border)]">
                        {[
                          swatchTheme.colors.background,
                          swatchTheme.colors.surface,
                          swatchTheme.colors.primary,
                          swatchTheme.colors.secondary,
                        ].map((color) => (
                          <span
                            className="min-w-0 flex-1"
                            key={color}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </span>
                      <span className="mt-2 block text-xs font-semibold text-[var(--forge-text)]">
                        {preset.name}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </section>

          <ColorGroup
            controls={QUICK_COLORS}
            colors={colors}
            onChange={updateColor}
            title="Simple controls"
          />

          <details className="rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_2.6%,transparent)] p-3">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--forge-text)]">
              Advanced colors
            </summary>
            <div className="mt-3">
              <ColorGroup
                controls={ADVANCED_COLORS}
                colors={colors}
                onChange={updateColor}
                title="Advanced controls"
              />
            </div>
          </details>
        </section>
      </div>

      <div className="sticky bottom-0 z-20 mt-3 border-t border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-bg)_92%,transparent)] px-3 py-3 backdrop-blur-xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-h-5 text-xs text-[var(--forge-muted)]" role="status">
            {message ?? (isDirty ? "Unsaved branding changes." : "Branding is up to date.")}
          </p>
          <div className="flex gap-2">
            <button
              className="forge-button forge-button-ghost forge-focus-ring min-h-10 flex-1 rounded-lg px-4 py-2 text-sm sm:flex-none"
              disabled={!isDirty || isSaving}
              onClick={cancelChanges}
              type="button"
            >
              Cancel
            </button>
            <button
              className="forge-button forge-button-primary forge-focus-ring min-h-10 flex-1 rounded-lg px-4 py-2 text-sm sm:flex-none"
              disabled={!isDirty || isSaving || !parsedTheme.ok}
              onClick={saveChanges}
              type="button"
            >
              Save branding
            </button>
          </div>
        </div>
      </div>

      <div
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-end bg-[color-mix(in_srgb,var(--forge-shadow)_70%,transparent)] p-3 sm:items-center sm:justify-center"
        hidden={!isRestoreOpen}
        role="dialog"
      >
        <div className="w-full max-w-md rounded-lg border border-[var(--forge-border-strong)] bg-[var(--forge-surface)] p-4 shadow-2xl">
          <h2 className="text-base font-semibold text-[var(--forge-text)]">
            Restore Argos defaults?
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--forge-muted)]">
            {RESTORE_CONFIRMATION_COPY}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              className="forge-button forge-button-ghost forge-focus-ring min-h-10 rounded-lg px-4 py-2 text-sm"
              onClick={() => setIsRestoreOpen(false)}
              type="button"
            >
              Keep custom colors
            </button>
            <button
              className="forge-button forge-button-primary forge-focus-ring min-h-10 rounded-lg px-4 py-2 text-sm"
              disabled={isSaving}
              onClick={restoreDefaults}
              type="button"
            >
              Restore defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorGroup({
  colors,
  controls,
  onChange,
  title,
}: {
  colors: Record<ColorField, string>;
  controls: ColorControl[];
  onChange: (field: ColorField, value: string) => void;
  title: string;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_2.6%,transparent)] p-3"
    >
      <div className="grid gap-2">
        {controls.map((control) => (
          <label
            className="grid gap-2 rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-shadow)_72%,transparent)] p-3 sm:grid-cols-[minmax(0,1fr)_150px]"
            data-branding-color-row={control.field}
            key={control.field}
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[var(--forge-text)]">
                {control.label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-[var(--forge-muted)]">
                {control.description}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <input
                aria-label={`${control.label} color picker`}
                className="h-10 w-12 rounded-md border border-[var(--forge-border)] bg-transparent"
                onChange={(event) => onChange(control.field, event.target.value)}
                type="color"
                value={getColorInputValue(colors[control.field])}
              />
              <input
                aria-label={`${control.label} hex value`}
                className="forge-focus-ring min-h-10 min-w-0 flex-1 rounded-lg border border-[var(--forge-border)] bg-[var(--forge-surface)] px-3 text-sm font-semibold text-[var(--forge-text)]"
                inputMode="text"
                onChange={(event) => onChange(control.field, event.target.value)}
                spellCheck={false}
                value={colors[control.field]}
              />
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

function ThemePreview({
  organizationName,
  theme,
  validationMessage,
}: {
  organizationName: string;
  theme: WorkspaceTheme;
  validationMessage: string | null;
}) {
  return (
    <section
      className="rounded-lg border border-[var(--forge-border)] p-3"
      data-branding-preview="true"
      style={workspaceThemeToForgeVars(theme) as CSSProperties}
    >
      <div className="rounded-lg border border-[var(--forge-border)] bg-[var(--forge-bg)] p-3 text-[var(--forge-text)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--forge-border)] pb-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--forge-muted)]">
              Workspace preview
            </p>
            <h2 className="mt-1 text-base font-semibold">{organizationName}</h2>
          </div>
          <span className="rounded-md bg-[var(--forge-gold)] px-2.5 py-1 text-xs font-bold text-[var(--forge-on-accent)]">
            Primary
          </span>
        </div>
        <div className="mt-3 grid gap-2">
          <div className="rounded-lg border border-[var(--forge-border)] bg-[var(--forge-surface)] p-3">
            <p className="text-sm font-semibold">Review queue</p>
            <p className="mt-1 text-xs leading-5 text-[var(--forge-muted)]">
              Buttons, text, panels, dividers, and status colors update here before saving.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="forge-button forge-button-primary min-h-9 rounded-lg px-3 py-2 text-xs" type="button">
                Approve
              </button>
              <button className="rounded-lg border border-[var(--forge-border)] px-3 py-2 text-xs text-[var(--forge-text)]" type="button">
                Secondary
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <span className="rounded-md border border-[var(--forge-border)] p-2 text-[var(--forge-success)]">
              Success
            </span>
            <span className="rounded-md border border-[var(--forge-border)] p-2 text-[var(--forge-ember)]">
              Warning
            </span>
            <span className="rounded-md border border-[var(--forge-border)] p-2 text-[var(--forge-danger)]">
              Danger
            </span>
          </div>
        </div>
        {validationMessage ? (
          <p className="mt-3 rounded-lg border border-[var(--forge-danger)] p-2 text-xs text-[var(--forge-danger)]">
            {validationMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ValidationPanel({
  contrastFailures,
  validationMessage,
}: {
  contrastFailures: ReturnType<typeof checkWorkspaceThemeContrast>;
  validationMessage: string | null;
}) {
  const checks = [
    { label: "Body text", passed: !contrastFailures.some((failure) => failure.field === "text") },
    { label: "Muted text", passed: !contrastFailures.some((failure) => failure.field === "mutedText") },
    { label: "Button text", passed: !contrastFailures.some((failure) => failure.field === "onPrimary") },
    { label: "Focus ring", passed: !contrastFailures.some((failure) => failure.field === "focus") },
  ];

  return (
    <section className="rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-shadow)_88%,transparent)] p-3">
      <h2 className="text-sm font-semibold text-[var(--forge-text)]">
        Safety checks
      </h2>
      <div className="mt-3 grid gap-2">
        {checks.map((check) => (
          <div
            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--forge-border)] px-3 py-2 text-sm"
            key={check.label}
          >
            <span className="text-[var(--forge-muted)]">{check.label}</span>
            <span className={check.passed ? "text-[var(--forge-success)]" : "text-[var(--forge-danger)]"}>
              {check.passed ? "Pass" : "Fix"}
            </span>
          </div>
        ))}
      </div>
      {validationMessage ? (
        <p className="mt-3 text-xs leading-5 text-[var(--forge-danger)]">
          {validationMessage}
        </p>
      ) : (
        <p className="mt-3 text-xs leading-5 text-[var(--forge-muted)]">
          Themes must keep text, buttons, and focus states readable before they can be saved.
        </p>
      )}
    </section>
  );
}
