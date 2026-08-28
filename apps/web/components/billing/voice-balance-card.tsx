"use client";

import { useCallback, useEffect, useState } from "react";
import { ForgeButton, ForgeChip, ForgeIcon, ForgeSurface } from "@/components/forge";
import { ForgeDialog } from "@/components/forge-dialog";
import {
  getBillingCheckoutHref,
  type BillingPlanId,
} from "@/lib/billing/plans";
import {
  voicePackOptions,
  type VoiceBalance,
  type VoiceBalanceState,
} from "@/lib/billing/voice-balance";

type VoiceBalanceCardProps = {
  onVoiceAvailabilityChange?: (available: boolean | null) => void;
  refreshKey?: number;
  returnTo: "/roleplay" | "/settings";
};

type BalanceApiError = {
  code?: string;
  error: string;
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function formatPrice(unitAmountCents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(unitAmountCents / 100);
}

function balanceTone(state: VoiceBalanceState) {
  if (state === "exhausted" || state === "critical") return "danger" as const;
  if (state === "low") return "ember" as const;
  return "success" as const;
}

export function VoiceBalanceCard({
  onVoiceAvailabilityChange,
  refreshKey = 0,
  returnTo,
}: VoiceBalanceCardProps) {
  const [balance, setBalance] = useState<VoiceBalance | null>(null);
  const [error, setError] = useState<BalanceApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadBalance = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/billing/voice-balance", {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as
        | VoiceBalance
        | BalanceApiError
        | null;

      if (!response.ok || !payload || "error" in payload) {
        const nextError =
          payload && "error" in payload
            ? payload
            : { error: "Unable to load the voice-minute balance." };
        setBalance(null);
        setError(nextError);
        onVoiceAvailabilityChange?.(
          nextError.code === "software_access_required" ? false : null,
        );
        return;
      }

      setBalance(payload);
      setError(null);
      onVoiceAvailabilityChange?.(
        payload.isUnlimited || payload.totalMinutesRemaining > 0,
      );
    } catch {
      setBalance(null);
      setError({ error: "Unable to load the voice-minute balance." });
      onVoiceAvailabilityChange?.(null);
    } finally {
      setIsLoading(false);
    }
  }, [onVoiceAvailabilityChange]);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance, refreshKey]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("checkout") === "success" &&
      params.get("plan")?.startsWith("extra-")
    ) {
      const timeout = window.setTimeout(() => void loadBalance(), 1500);
      return () => window.clearTimeout(timeout);
    }
  }, [loadBalance]);

  if (isLoading && !balance && !error) {
    return (
      <ForgeSurface
        className="p-4"
        data-voice-balance-state="loading"
        variant="panel"
      >
        <div className="flex items-center gap-3 text-sm text-[var(--forge-muted)]">
          <ForgeIcon className="animate-spin" name="refresh" size={16} />
          Loading live voice access…
        </div>
      </ForgeSurface>
    );
  }

  if (!balance) {
    const accessRequired = error?.code === "software_access_required";

    return (
      <ForgeSurface
        className="p-4"
        data-voice-balance-state={accessRequired ? "access-required" : "unavailable"}
        variant="panel"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="forge-page-eyebrow">Live voice minutes</p>
            <h2 className="mt-1 text-base font-semibold text-[var(--forge-text)]">
              {accessRequired ? "Choose a software plan to use live voice" : "Balance unavailable"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--forge-muted)]">
              {accessRequired
                ? "Solo includes 120 monthly minutes. Team includes 120 pooled monthly minutes per seat."
                : error?.error ?? "The current balance could not be loaded."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {accessRequired ? (
              <>
                <ForgeButton
                  href={getBillingCheckoutHref("solo", { returnTo })}
                  size="sm"
                  variant="primary"
                >
                  Choose Solo
                </ForgeButton>
                <ForgeButton
                  href={getBillingCheckoutHref("team", { returnTo })}
                  size="sm"
                  variant="secondary"
                >
                  Choose Team
                </ForgeButton>
              </>
            ) : (
              <ForgeButton onClick={() => void loadBalance()} size="sm" variant="secondary">
                Try again
              </ForgeButton>
            )}
          </div>
        </div>
      </ForgeSurface>
    );
  }

  return <VoiceBalanceSummary balance={balance} returnTo={returnTo} />;
}

export function VoiceBalanceSummary({
  balance,
  returnTo,
}: {
  balance: VoiceBalance;
  returnTo: VoiceBalanceCardProps["returnTo"];
}) {
  const [isPackDialogOpen, setIsPackDialogOpen] = useState(false);
  const tone = balanceTone(balance.state);
  const periodLabel =
    balance.renewalDate &&
    `Included minutes reset ${formatDate(balance.renewalDate)}`;
  const accessLabel =
    balance.accessSource === "coaching_contract"
      ? `Included with coaching${
          balance.accessEndsAt ? ` through ${formatDate(balance.accessEndsAt)}` : ""
        }`
      : periodLabel;

  return (
    <>
      <ForgeSurface
        className="p-4"
        data-voice-balance-state={balance.isUnlimited ? "unlimited" : balance.state}
        variant="panel"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="forge-page-eyebrow">Live voice minutes</p>
              <ForgeChip tone={tone}>
                {balance.isUnlimited
                  ? "Unlimited"
                  : balance.state === "healthy"
                  ? "Available"
                  : balance.state === "low"
                    ? "Running low"
                    : balance.state === "critical"
                      ? "Almost out"
                      : "Out of minutes"}
              </ForgeChip>
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <strong className="text-2xl font-semibold text-[var(--forge-text)]">
                {balance.isUnlimited ? "Unlimited" : balance.totalMinutesRemaining}
              </strong>
              <span className="text-sm text-[var(--forge-muted)]">
                {balance.isUnlimited ? "live voice" : "pooled minutes remaining"}
              </span>
            </div>
            {balance.isUnlimited ? null : (
              <div
                aria-label={`${balance.remainingPercentage}% of voice minutes remaining`}
                className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--forge-surface-3)]"
                role="progressbar"
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={balance.remainingPercentage}
              >
                <div
                  className={
                    tone === "danger"
                      ? "h-full bg-[var(--forge-danger)]"
                      : tone === "ember"
                        ? "h-full bg-[var(--forge-ember)]"
                        : "h-full bg-[var(--forge-success)]"
                  }
                  style={{ width: `${balance.remainingPercentage}%` }}
                />
              </div>
            )}
            <p className="mt-2 text-xs leading-5 text-[var(--forge-muted)]">
              <span className="capitalize">
                {balance.isUnlimited ? "Enterprise" : balance.package}
              </span>
              {!balance.isUnlimited && balance.package === "team"
                ? ` · ${balance.seatCount} seats`
                : ""}
              {balance.isUnlimited
                ? " · Unlimited live voice included"
                : ` · ${balance.includedMinutesRemaining} included`}
              {!balance.isUnlimited && balance.purchasedMinutesRemaining > 0
                ? ` + ${balance.purchasedMinutesRemaining} purchased`
                : ""}
              {accessLabel ? ` · ${accessLabel}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!balance.isUnlimited && balance.canPurchaseMinutes ? (
              <ForgeButton
                icon="plus_circle"
                onClick={() => setIsPackDialogOpen(true)}
                size="sm"
                variant="primary"
              >
                Buy minutes
              </ForgeButton>
            ) : !balance.isUnlimited ? (
              <p className="max-w-xs text-sm text-[var(--forge-muted)]">
                Contact your organization admin to buy more minutes.
              </p>
            ) : null}
            {balance.canManageBasePlan ? (
              <ForgeButton
                href={`/billing/portal?return_to=${encodeURIComponent(returnTo)}`}
                size="sm"
                variant="secondary"
              >
                Manage plan
              </ForgeButton>
            ) : null}
          </div>
        </div>
      </ForgeSurface>

      {balance.isUnlimited ? null : (
        <ForgeDialog
          description="Extra minutes are added to the same pooled workspace balance and do not expire at the monthly reset."
          onOpenChange={setIsPackDialogOpen}
          open={isPackDialogOpen}
          title="Buy live voice minutes"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {voicePackOptions.map((pack) => (
              <a
                className="rounded-xl border border-[var(--forge-border)] bg-[var(--forge-surface-2)] p-4 transition hover:border-[var(--forge-gold)]"
                data-voice-pack={pack.id}
                href={getBillingCheckoutHref(pack.id as BillingPlanId, { returnTo })}
                key={pack.id}
              >
                <strong className="block text-lg text-[var(--forge-text)]">
                  {pack.minutes.toLocaleString()}
                </strong>
                <span className="mt-1 block text-xs text-[var(--forge-muted)]">minutes</span>
                <span className="mt-4 block text-sm font-semibold text-[var(--forge-gold)]">
                  {formatPrice(pack.unitAmountCents)}
                </span>
              </a>
            ))}
          </div>
        </ForgeDialog>
      )}
    </>
  );
}
