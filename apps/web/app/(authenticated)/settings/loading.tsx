import { ForgeSkeleton, ForgeStatusPanel } from "@/components/forge";
import { PageFrame } from "@/components/page-frame";

export default function Loading() {
  return (
    <div aria-busy="true" data-authenticated-route-state="loading">
      <PageFrame
        description="Loading account, people, teams, integrations, compliance, and rubric controls."
        eyebrow="Settings"
        statusChips={[{ icon: "pending", label: "Loading", tone: "gold" }]}
        title="Control room"
      >
        <ForgeStatusPanel
          announce="polite"
          description="Argos is preparing the settings workspace. Controls will appear here when loading finishes."
          icon="pending"
          title="Loading control room"
          tone="gold"
        />
        <div className="grid gap-4 lg:grid-cols-2" data-authenticated-route-skeletons="true">
          <ForgeSkeleton label="Loading settings controls" lines={4} />
          <ForgeSkeleton label="Loading settings supporting panels" lines={3} />
        </div>
      </PageFrame>
    </div>
  );
}
