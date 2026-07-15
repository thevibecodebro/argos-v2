import type { Metadata } from "next";
import { JsonLd } from "@/components/public/json-ld";
import { LegalPage } from "@/components/public/legal-page";
import { buildLegalPageJsonLd } from "@/lib/seo/schema";

const privacyPolicyTitle = "Privacy Policy";
const privacyPolicyDescription =
  "Learn what information Argos uses to deliver call review, coaching, training, and related platform operations.";

export const metadata: Metadata = {
  title: privacyPolicyTitle,
  description: privacyPolicyDescription,
  alternates: {
    canonical: "/privacy-policy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <JsonLd
        data={buildLegalPageJsonLd({
          description: privacyPolicyDescription,
          path: "/privacy-policy",
          title: privacyPolicyTitle,
        })}
      />
      <LegalPage
        eyebrow="Argos Policy"
        intro="This Privacy Policy explains what information Argos uses to deliver call review, coaching, training, and related platform operations for sales organizations."
        lastUpdated="July 15, 2026"
        sections={[
          {
            title: "What we collect",
            body: [
              "We collect account details, workspace configuration, and usage data needed to operate the Argos platform. That can include names, work email addresses, team membership, rubric configuration, and activity generated when users review calls or assign follow-up training.",
              "When customers connect call sources or recording providers, Argos may process recordings, transcripts, scorecards, and associated metadata strictly to provide the product features requested by the customer organization.",
            ],
          },
          {
            title: "Google Workspace data",
            body: [
              "When an organization administrator connects a Google Meet organizer account, Argos requests the organizer's email address and read-only access to Google Meet space metadata, Google Calendar events, and Google Drive files created or edited by Google Meet. Argos uses Meet and Calendar metadata to identify recorded meetings and resolve their titles, and uses Drive access only to retrieve eligible Google Meet recording files selected by the organization's title rules.",
              "Argos does not request permission to edit Google Calendar events or Google Drive files, and does not use the Google Meet Drive permission to access files unrelated to Google Meet.",
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
            title: "Google API Limited Use",
            body: [
              "Argos's use and transfer to any other app of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.",
              "Argos does not use Google Workspace data for advertising, sell it to third parties, or use it to train generalized artificial intelligence or machine-learning models. Human access is limited to actions requested by the customer, security or abuse investigation, legal obligations, or service operations performed under appropriate confidentiality controls.",
            ],
          },
          {
            title: "Retention and control",
            body: [
              "Customer organizations control the operational use of their workspace and are responsible for ensuring they have the right to upload, sync, or process call-related material in Argos.",
              "Disconnecting Google Meet revokes Argos access at Google, stops future imports, and removes Google discovery metadata from the integration records. Existing Argos calls remain available until an organization administrator deletes them.",
              "Deleting an imported call removes its private recording and derived call data. Argos retains only the opaque Google recording resource name needed to prevent that recording from being imported again; the title, Drive file identifier, meeting code, and conference metadata are removed.",
              "We otherwise retain data for as long as needed to provide the service, satisfy legal obligations, resolve disputes, and enforce agreements. Customers can request deletion or export workflows subject to contractual and legal requirements.",
            ],
          },
        ]}
        title={privacyPolicyTitle}
      />
    </>
  );
}
