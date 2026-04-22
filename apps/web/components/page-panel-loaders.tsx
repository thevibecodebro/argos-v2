"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

function PanelSkeleton({
  className = "",
  lines = 5,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div
      aria-busy="true"
      className={`rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)] ${className}`}
    >
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-full bg-white/[0.08]" />
        <div className="grid gap-3">
          {Array.from({ length: lines }).map((_, index) => (
            <div
              className="h-12 animate-pulse rounded-2xl bg-white/[0.06]"
              key={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type LoginFormProps = {
  nextPath: string;
};
type OnboardingPanelProps = Record<string, never>;
type UploadCallPanelProps = Record<string, never>;
type NotificationsPanelProps = ComponentProps<
  (typeof import("./notifications-panel"))["NotificationsPanel"]
>;
type RoleplayPanelProps = ComponentProps<
  (typeof import("./roleplay-panel"))["RoleplayPanel"]
>;
type TrainingPanelProps = ComponentProps<
  (typeof import("./training-panel"))["TrainingPanel"]
>;
type CallDetailPanelProps = ComponentProps<
  (typeof import("./call-detail-panel"))["CallDetailPanel"]
>;
type AccountPanelProps = ComponentProps<
  (typeof import("./settings/account-panel"))["AccountPanel"]
>;
type CompliancePanelProps = ComponentProps<
  (typeof import("./settings/compliance-panel"))["CompliancePanel"]
>;
type IntegrationsPanelProps = ComponentProps<
  (typeof import("./settings/integrations-panel"))["IntegrationsPanel"]
>;
type PeoplePanelProps = ComponentProps<
  (typeof import("./settings/people-panel"))["PeoplePanel"]
>;
type PermissionsPanelProps = ComponentProps<
  (typeof import("./settings/permissions-panel"))["PermissionsPanel"]
>;
type TeamsPanelProps = ComponentProps<
  (typeof import("./settings/teams-panel"))["TeamsPanel"]
>;
type RubricsPanelProps = ComponentProps<
  (typeof import("./settings/rubrics-panel"))["RubricsPanel"]
>;

const DynamicLoginForm = dynamic<LoginFormProps>(
  () => import("./auth/login-form").then((mod) => mod.LoginForm),
  { loading: () => <PanelSkeleton className="min-h-[28rem]" lines={6} /> },
);
const DynamicOnboardingPanel = dynamic<OnboardingPanelProps>(
  () => import("./onboarding-panel").then((mod) => mod.OnboardingPanel),
  { loading: () => <PanelSkeleton className="min-h-[20rem]" lines={5} /> },
);
const DynamicUploadCallPanel = dynamic<UploadCallPanelProps>(
  () => import("./upload-call-panel").then((mod) => mod.UploadCallPanel),
  { loading: () => <PanelSkeleton className="min-h-[26rem]" lines={4} /> },
);
const DynamicNotificationsPanel = dynamic<NotificationsPanelProps>(
  () => import("./notifications-panel").then((mod) => mod.NotificationsPanel),
  { loading: () => <PanelSkeleton className="min-h-[22rem]" lines={5} /> },
);
const DynamicRoleplayPanel = dynamic<RoleplayPanelProps>(
  () => import("./roleplay-panel").then((mod) => mod.RoleplayPanel),
  { loading: () => <PanelSkeleton className="min-h-[36rem]" lines={8} /> },
);
const DynamicTrainingPanel = dynamic<TrainingPanelProps>(
  () => import("./training-panel").then((mod) => mod.TrainingPanel),
  { loading: () => <PanelSkeleton className="min-h-[40rem]" lines={9} /> },
);
const DynamicCallDetailPanel = dynamic<CallDetailPanelProps>(
  () => import("./call-detail-panel").then((mod) => mod.CallDetailPanel),
  { loading: () => <PanelSkeleton className="min-h-[34rem]" lines={8} /> },
);
const DynamicAccountPanel = dynamic<AccountPanelProps>(
  () => import("./settings/account-panel").then((mod) => mod.AccountPanel),
  { loading: () => <PanelSkeleton className="min-h-[18rem]" lines={4} /> },
);
const DynamicCompliancePanel = dynamic<CompliancePanelProps>(
  () => import("./settings/compliance-panel").then((mod) => mod.CompliancePanel),
  { loading: () => <PanelSkeleton className="min-h-[18rem]" lines={4} /> },
);
const DynamicIntegrationsPanel = dynamic<IntegrationsPanelProps>(
  () => import("./settings/integrations-panel").then((mod) => mod.IntegrationsPanel),
  { loading: () => <PanelSkeleton className="min-h-[20rem]" lines={5} /> },
);
const DynamicPeoplePanel = dynamic<PeoplePanelProps>(
  () => import("./settings/people-panel").then((mod) => mod.PeoplePanel),
  { loading: () => <PanelSkeleton className="min-h-[26rem]" lines={6} /> },
);
const DynamicPermissionsPanel = dynamic<PermissionsPanelProps>(
  () => import("./settings/permissions-panel").then((mod) => mod.PermissionsPanel),
  { loading: () => <PanelSkeleton className="min-h-[24rem]" lines={6} /> },
);
const DynamicTeamsPanel = dynamic<TeamsPanelProps>(
  () => import("./settings/teams-panel").then((mod) => mod.TeamsPanel),
  { loading: () => <PanelSkeleton className="min-h-[24rem]" lines={6} /> },
);
const DynamicRubricsPanel = dynamic<RubricsPanelProps>(
  () => import("./settings/rubrics-panel").then((mod) => mod.RubricsPanel),
  { loading: () => <PanelSkeleton className="min-h-[28rem]" lines={7} /> },
);

export function LoginForm(props: LoginFormProps) {
  return <DynamicLoginForm {...props} />;
}

export function OnboardingPanel(props: OnboardingPanelProps) {
  return <DynamicOnboardingPanel {...props} />;
}

export function UploadCallPanel(props: UploadCallPanelProps) {
  return <DynamicUploadCallPanel {...props} />;
}

export function NotificationsPanel(props: NotificationsPanelProps) {
  return <DynamicNotificationsPanel {...props} />;
}

export function RoleplayPanel(props: RoleplayPanelProps) {
  return <DynamicRoleplayPanel {...props} />;
}

export function TrainingPanel(props: TrainingPanelProps) {
  return <DynamicTrainingPanel {...props} />;
}

export function CallDetailPanel(props: CallDetailPanelProps) {
  return <DynamicCallDetailPanel {...props} />;
}

export function AccountPanel(props: AccountPanelProps) {
  return <DynamicAccountPanel {...props} />;
}

export function CompliancePanel(props: CompliancePanelProps) {
  return <DynamicCompliancePanel {...props} />;
}

export function IntegrationsPanel(props: IntegrationsPanelProps) {
  return <DynamicIntegrationsPanel {...props} />;
}

export function PeoplePanel(props: PeoplePanelProps) {
  return <DynamicPeoplePanel {...props} />;
}

export function PermissionsPanel(props: PermissionsPanelProps) {
  return <DynamicPermissionsPanel {...props} />;
}

export function TeamsPanel(props: TeamsPanelProps) {
  return <DynamicTeamsPanel {...props} />;
}

export function RubricsPanel(props: RubricsPanelProps) {
  return <DynamicRubricsPanel {...props} />;
}
