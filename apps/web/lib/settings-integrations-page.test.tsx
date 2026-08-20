import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  createEffectiveTenantRepository,
  createIngestionTitleFiltersRepository,
  createIntegrationsRepository,
  getAuthenticatedUser,
  getCurrentUserDetails,
  getIntegrationStatuses,
  getOrganizationIngestionTitleFilters,
  integrationsPanel,
  requireAnyManagedCapabilityForPage,
} = vi.hoisted(() => ({
  createEffectiveTenantRepository: vi.fn(),
  createIngestionTitleFiltersRepository: vi.fn(),
  createIntegrationsRepository: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  getCurrentUserDetails: vi.fn(),
  getIntegrationStatuses: vi.fn(),
  getOrganizationIngestionTitleFilters: vi.fn(),
  integrationsPanel: vi.fn((_props: Record<string, unknown>) => null),
  requireAnyManagedCapabilityForPage: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/components/panel-loaders/integrations-panel-loader", () => ({
  IntegrationsPanel: integrationsPanel,
}));

vi.mock("@/lib/auth/request-user", () => ({
  getCachedAuthenticatedSupabaseUser: getAuthenticatedUser,
  getCachedCurrentUserDetails: getCurrentUserDetails,
}));

vi.mock("@/lib/access/managed-capabilities-server", () => ({
  requireAnyManagedCapabilityForPage,
}));

vi.mock("@/lib/ingestion-title-filters/create-repository", () => ({
  createIngestionTitleFiltersRepository,
}));

vi.mock("@/lib/ingestion-title-filters/service", () => ({
  getOrganizationIngestionTitleFilters,
}));

vi.mock("@/lib/integrations/create-repository", () => ({
  createIntegrationsRepository,
}));

vi.mock("@/lib/integrations/service", () => ({
  getIntegrationStatuses,
}));

vi.mock("@/lib/platform/effective-request", () => ({
  createEffectiveTenantRepository,
  createEffectiveTenantUsersRepository: vi.fn(async (repository) => repository),
}));

vi.mock("@/lib/users/create-repository", () => ({
  createUsersRepository: vi.fn(() => ({ type: "users" })),
}));

vi.mock("@/lib/users/service", () => ({
  listOrganizationMembers: vi.fn().mockResolvedValue({ data: [], ok: true }),
}));

import SettingsIntegrationsPage from "../app/(authenticated)/settings/integrations/page";

describe("SettingsIntegrationsPage", () => {
  afterEach(() => {
    delete process.env.ARGOS_INGESTION_TITLE_FILTERS_ENFORCED;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ARGOS_INGESTION_TITLE_FILTERS_ENFORCED;
    getAuthenticatedUser.mockResolvedValue({ id: "auth-user-1" });
    getCurrentUserDetails.mockResolvedValue({
      data: { role: "admin" },
      ok: true,
    });
    requireAnyManagedCapabilityForPage.mockResolvedValue({
      access: { capabilities: [], mode: "legacy" },
      orgId: "org-1",
    });
    createIngestionTitleFiltersRepository.mockReturnValue({ type: "title-filters" });
    createIntegrationsRepository.mockReturnValue({ type: "integrations" });
    createEffectiveTenantRepository.mockImplementation(async (repository) => ({
      type: `effective-${repository.type}`,
    }));
    getIntegrationStatuses.mockResolvedValue({
      data: {
        ghl: { available: true, connected: false },
        googleMeet: { available: true, connected: true },
        zoom: { available: true, connected: false },
      },
      ok: true,
    });
    getOrganizationIngestionTitleFilters.mockResolvedValue({
      data: {
        configured: true,
        excludePhrases: ["Internal"],
        includePhrases: ["Discovery Call"],
      },
      ok: true,
    });
  });

  it("loads integrations and title filters through their effective tenant repositories", async () => {
    renderToStaticMarkup(await SettingsIntegrationsPage());

    expect(createEffectiveTenantRepository).toHaveBeenCalledTimes(2);
    expect(createEffectiveTenantRepository).toHaveBeenCalledWith(
      { type: "integrations" },
      "auth-user-1",
    );
    expect(createEffectiveTenantRepository).toHaveBeenCalledWith(
      { type: "title-filters" },
      "auth-user-1",
    );
    expect(getIntegrationStatuses).toHaveBeenCalledWith(
      { type: "effective-integrations" },
      "auth-user-1",
    );
    expect(getOrganizationIngestionTitleFilters).toHaveBeenCalledWith(
      { type: "effective-title-filters" },
      "auth-user-1",
    );
    expect(integrationsPanel.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        titleFilterEnforcementEnabled: false,
        titleFilters: {
          configured: true,
          excludePhrases: ["Internal"],
          includePhrases: ["Discovery Call"],
        },
        googleMeet: expect.objectContaining({
          connected: true,
          fallbackOwnerOptions: [],
        }),
      }),
    );
  });

  it("enables title-filter status claims only when server enforcement is explicitly true", async () => {
    process.env.ARGOS_INGESTION_TITLE_FILTERS_ENFORCED = "true";

    renderToStaticMarkup(await SettingsIntegrationsPage());

    expect(integrationsPanel.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        titleFilterEnforcementEnabled: true,
      }),
    );
  });

  it("does not serialize disabled provider metadata into a managed tenant page", async () => {
    requireAnyManagedCapabilityForPage.mockResolvedValueOnce({
      access: {
        capabilities: ["integration_google_meet"],
        mode: "managed",
      },
      orgId: "org-1",
    });

    renderToStaticMarkup(await SettingsIntegrationsPage());

    expect(integrationsPanel.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        googleMeet: expect.objectContaining({ connected: true }),
        ghl: undefined,
        zoom: undefined,
      }),
    );
  });
});
