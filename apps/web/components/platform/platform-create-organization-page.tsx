"use client";

import { useState, type FormEvent } from "react";
import { ForgeButton, ForgeSurface } from "@/components/forge";
import {
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import {
  CREATE_ORGANIZATION_ENDPOINT,
  submitCreateOrganization,
} from "./platform-console-actions";

export function PlatformCreateOrganizationPage() {
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateStatus(null);
    setIsCreating(true);

    const form = event.currentTarget;

    try {
      const data = await submitCreateOrganization(fetch, new FormData(form));
      setCreateStatus(`Created ${data.organization.name}. Invite prepared for ${data.invite.email}.`);
      form.reset();
    } catch (error) {
      setCreateStatus(error instanceof Error ? error.message : "Unable to create organization");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <OperationalWorkspace
      className="mx-auto w-full max-w-[980px] px-4 py-5 sm:px-6 lg:px-8"
      data-platform-create-page="true"
      data-platform-create-organization-page="true"
    >
      <OperationalToolbar
        actions={[
          {
            href: "/platform/organizations",
            icon: "business",
            label: "Organizations",
            variant: "secondary",
          },
        ]}
        description="Create the Organization and prepare the first admin invite."
        eyebrow="Agency"
        title="Create Organization"
      />

      <ForgeSurface className="p-4" variant="panel">
        <form
          className="grid gap-3"
          data-platform-create-endpoint={CREATE_ORGANIZATION_ENDPOINT}
          onSubmit={handleCreateOrganization}
        >
          <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
            Organization name
            <input
              className="min-h-10 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
              name="name"
              required
            />
          </label>
          <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
            Slug
            <input
              className="min-h-10 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
              name="slug"
              pattern="[a-z0-9-]+"
              required
            />
          </label>
          <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
            Plan
            <select
              className="min-h-10 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
              defaultValue="trial"
              name="plan"
            >
              <option value="trial">Trial</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
            Initial admin email
            <input
              className="min-h-10 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
              name="adminEmail"
              required
              type="email"
            />
          </label>
          <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
            Reason
            <textarea
              className="min-h-24 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
              name="reason"
              required
            />
          </label>
          {createStatus ? (
            <p className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-[var(--forge-muted)]">
              {createStatus}
            </p>
          ) : null}
          <ForgeButton disabled={isCreating} icon="add_business" type="submit" variant="primary">
            {isCreating ? "Creating" : "Create Organization"}
          </ForgeButton>
        </form>
      </ForgeSurface>
    </OperationalWorkspace>
  );
}
