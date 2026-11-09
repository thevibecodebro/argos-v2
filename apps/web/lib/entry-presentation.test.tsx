// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccessPendingView, AuthErrorView, PlatformMfaEntryView } from "@/components/auth/entry-views";
import { EntryPage } from "@/components/auth/entry-surface";
import { PlatformMfaCodeFields, PlatformMfaSubmitButton } from "@/app/platform/mfa/mfa-code-form";
import { InviteAccessShell, InviteActionPanel, InvitePrimarySignOutButton } from "@/components/invite/invite-access-shell";
import { CreatePanel, InvitePanel } from "@/components/onboarding-panel";

function documentFor(element: React.ReactNode) {
  return new DOMParser().parseFromString(renderToStaticMarkup(element), "text/html");
}

const noop = () => {};

describe("account entry presentation", () => {
  it("keeps one heading, a wrapping account name and real recovery destinations in pending access", () => {
    const organizationName = "A synthetic organization with a deliberately long unbroken name";
    const doc = documentFor(<AccessPendingView organizationName={organizationName} />);
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.body.textContent).toContain(organizationName);
    expect(doc.querySelector('a[href="/access-pending"]')?.textContent).toBe("Check again");
    expect(doc.querySelector('form[action="/auth/signout"]')?.getAttribute("method")).toBe("post");
    expect(doc.querySelector('form button')?.getAttribute("type")).toBe("submit");
    expect(doc.querySelector("[data-auth-shell]")?.getAttribute("style")).toContain("--forge-bg:#FAFAF8");
  });

  it("explains auth failure with a clear recovery step", () => {
    const doc = documentFor(<AuthErrorView />);
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.querySelector("h1")?.textContent).toBe("Sign-in did not finish");
    expect(doc.body.textContent).toContain("Return to login and try again. If it keeps happening, contact your workspace administrator.");
    expect(doc.body.textContent).not.toContain("Supabase");
    expect(doc.querySelector('a[href="/login"]')?.textContent).toBe("Return to login");
  });

  it("renders a synthetic MFA setup with accessible QR, numeric code, hidden factor and verify recovery", () => {
    const doc = documentFor(<PlatformMfaEntryView mode="setup" qrCode="data:image/svg+xml,%3Csvg/%3E" secret="SYNTHETIC-ONLY"><form><PlatformMfaCodeFields error={null} factorId="synthetic-factor" /></form></PlatformMfaEntryView>);
    expect(doc.querySelector("h1")?.textContent).toBe("Set up multi-factor authentication");
    expect(doc.querySelector("img[alt='Agency TOTP enrollment QR code']")).not.toBeNull();
    expect(doc.querySelector('input[name="factorId"]')?.getAttribute("value")).toBe("synthetic-factor");
    const input = doc.querySelector<HTMLInputElement>('#code');
    expect(doc.querySelector('label[for="code"]')?.textContent).toBe("Authentication code");
    expect(input?.getAttribute("autocomplete")).toBe("one-time-code");
    expect(input?.inputMode).toBe("numeric");
    expect(input?.required).toBe(true);
    expect(input?.getAttribute("pattern")).toBe("[0-9]*");
    expect(input?.getAttribute("aria-invalid")).toBeNull();
    expect(doc.querySelector('a[href="/platform/mfa/verify"]')).not.toBeNull();
  });

  it("associates MFA errors with the code and preserves pending submit semantics", () => {
    const doc = documentFor(<PlatformMfaEntryView mode="verify"><form><PlatformMfaCodeFields error="Synthetic verification error with recovery guidance." factorId="synthetic-factor"><PlatformMfaSubmitButton pending /></PlatformMfaCodeFields></form></PlatformMfaEntryView>);
    const input = doc.querySelector('#code');
    expect(input?.getAttribute("aria-invalid")).toBe("true");
    expect(input?.getAttribute("aria-describedby")).toBe("mfa-code-error");
    expect(doc.getElementById("mfa-code-error")?.getAttribute("role")).toBe("alert");
    expect(doc.querySelector("button")?.disabled).toBe(true);
    expect(doc.querySelector("button")?.textContent).toBe("Verifying...");
    expect(doc.querySelector('a[href="/platform/mfa/setup"]')).not.toBeNull();
  });

  it("keeps invite recovery as a POST and removes marketing scene/hero chrome", () => {
    const doc = documentFor(<InviteAccessShell heading="Wrong account" description="This invite was sent to a different email address." role="rep"><InviteActionPanel title="Email does not match" description="Use the invited email." tone="danger"><InvitePrimarySignOutButton>Use a different email</InvitePrimarySignOutButton></InviteActionPanel></InviteAccessShell>);
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.querySelector('form[action="/auth/signout"]')?.getAttribute("method")).toBe("post");
    expect(doc.querySelectorAll('[data-argos-logo]')).toHaveLength(1);
    expect(doc.querySelector("canvas")).toBeNull();
    expect(doc.querySelector("[data-reveal]")).toBeNull();
    expect(doc.querySelector('nav[aria-label="Legal"] a[href="/privacy-policy"]')).not.toBeNull();
  });

  it("preserves accessible onboarding fields and disabled create actions", () => {
    const doc = documentFor(<EntryPage><CreatePanel accessMode="bootstrap-admin" error={null} isMutating={false} name="" slug="" onNameChange={noop} onSlugChange={noop} onSubmit={noop} /></EntryPage>);
    expect(doc.querySelectorAll('label input')).toHaveLength(2);
    expect(Array.from(doc.querySelectorAll('label')).map((label) => label.textContent)).toEqual(["Organization Name", "Organization Slugargos.app/"]);
    expect(Array.from(doc.querySelectorAll("button")).find((button) => button.textContent === "Create Organization")?.disabled).toBe(true);
    expect(doc.querySelector('form[action="/auth/signout"]')).not.toBeNull();
  });

  it("keeps role-based team assignment and success/error announcements in the invite step", () => {
    const props = { error: "Synthetic invite error", inviteEmail: "synthetic@example.invalid", inviteRole: "manager" as const, inviteSuccess: "Synthetic success", inviteTeamIds: ["synthetic-team"], isMutating: false, onDashboard: noop, onEmailChange: noop, onRoleChange: noop, onSubmit: noop, onTeamToggle: noop, teams: [{id: "synthetic-team", name: "Synthetic team"}] };
    const doc = documentFor(<EntryPage><InvitePanel {...props} /></EntryPage>);
    expect(doc.querySelector('input[type="email"]')).not.toBeNull();
    expect(doc.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
    expect(doc.querySelectorAll("select option")).toHaveLength(4);
    expect(doc.querySelector('[role="alert"]')?.textContent).toContain("Synthetic invite error");
    expect(doc.querySelector('[aria-live="polite"]')?.textContent).toContain("Synthetic success");
    const adminDoc = documentFor(<EntryPage><InvitePanel {...props} inviteRole="admin" /></EntryPage>);
    expect(adminDoc.querySelector('input[type="checkbox"]')).toBeNull();
  });
});
