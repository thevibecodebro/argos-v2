import { LegalPage } from "@/components/public/legal-page";

export default function TermsOfServicePage() {
  return (
    <LegalPage
      eyebrow="Argos Terms"
      intro="These Terms of Service govern access to Argos and describe the responsibilities that apply when a customer organization or authorized user uses the platform."
      lastUpdated="April 22, 2026"
      sections={[
        {
          title: "Permitted use",
          body: [
            "Argos may only be used for lawful business purposes and in accordance with customer-authorized access. Users must not attempt to reverse engineer the service, interfere with platform availability, or access workspaces they are not authorized to use.",
            "Customers are responsible for the legality of the content they submit, sync, or process through Argos, including recorded conversations, transcripts, training material, and third-party integrations.",
          ],
        },
        {
          title: "Customer responsibilities",
          body: [
            "Each customer organization is responsible for managing user access, internal policies, and any consent or disclosure obligations tied to recording, transcription, or coaching workflows.",
            "Customers must keep credentials secure and notify Argos promptly if they suspect unauthorized access, data exposure, or misuse of the platform.",
          ],
        },
        {
          title: "Service boundaries",
          body: [
            "Argos may update, improve, or remove features as the product evolves. We may suspend access to protect the service, investigate abuse, or comply with legal obligations.",
            "Except where prohibited by law or specifically agreed in writing, Argos is provided on an as-available basis and liability is limited to the maximum extent permitted by applicable law.",
          ],
        },
      ]}
      title="Terms of Service"
    />
  );
}
