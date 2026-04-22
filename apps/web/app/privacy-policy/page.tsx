import { LegalPage } from "@/components/public/legal-page";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Argos Policy"
      intro="This Privacy Policy explains what information Argos uses to deliver call review, coaching, training, and related platform operations for sales organizations."
      lastUpdated="April 22, 2026"
      sections={[
        {
          title: "What we collect",
          body: [
            "We collect account details, workspace configuration, and usage data needed to operate the Argos platform. That can include names, work email addresses, team membership, rubric configuration, and activity generated when users review calls or assign follow-up training.",
            "When customers connect call sources or recording providers, Argos may process recordings, transcripts, scorecards, and associated metadata strictly to provide the product features requested by the customer organization.",
          ],
        },
        {
          title: "How we use information",
          body: [
            "We use information to authenticate users, deliver workspace functionality, generate coaching outputs, maintain service quality, and investigate reliability or abuse issues.",
            "We do not use customer workspace data for unrelated product marketing. Access is limited to authorized personnel and service providers supporting platform delivery.",
          ],
        },
        {
          title: "Retention and control",
          body: [
            "Customer organizations control the operational use of their workspace and are responsible for ensuring they have the right to upload, sync, or process call-related material in Argos.",
            "We retain data for as long as needed to provide the service, satisfy legal obligations, resolve disputes, and enforce agreements. Customers can request deletion or export workflows subject to contractual and legal requirements.",
          ],
        },
      ]}
      title="Privacy Policy"
    />
  );
}
