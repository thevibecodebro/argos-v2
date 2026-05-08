import { ForgeSkeleton, ForgeStatusPanel } from "@/components/forge";
import {
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";

export default function Loading() {
  return (
    <div aria-busy="true" data-authenticated-route-state="loading">
      <OperationalWorkspace data-settings-detail-route="loading">
        <OperationalToolbar
          description="Loading account, people, teams, integrations, compliance, and rubric controls."
          eyebrow="Settings"
          status={{ icon: "pending", label: "Loading", tone: "gold" }}
          title="Settings"
        />
        <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3" data-authenticated-route-skeletons="true">
            <ForgeStatusPanel
              announce="polite"
              description="Argos is preparing settings. Controls will appear here when loading finishes."
              icon="pending"
              title="Loading settings"
              tone="gold"
            />
            <ForgeSkeleton label="Loading settings controls" lines={4} />
          </div>
          <OperationalPreviewDrawer
            description="Status and supporting context will load beside the active settings panel."
            eyebrow="Status drawer"
            title="Preparing settings"
          >
            <ForgeSkeleton label="Loading settings supporting panels" lines={3} />
          </OperationalPreviewDrawer>
        </section>
      </OperationalWorkspace>
    </div>
  );
}
