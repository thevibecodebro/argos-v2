import { LegalPage } from "@/components/public/legal-page";

export default function SecurityPolicyPage() {
  return (
    <LegalPage
      eyebrow="Argos Security"
      intro="This Security Policy summarizes the operational safeguards Argos applies to protect customer workspaces, application access, and supporting infrastructure."
      lastUpdated="April 22, 2026"
      sections={[
        {
          title: "Infrastructure safeguards",
          body: [
            "Argos uses layered access controls, environment separation, logging, and managed infrastructure services to reduce unauthorized access risk and support incident investigation.",
            "Administrative access is limited to authorized personnel with a business need, and changes to production systems are controlled through reviewed deployment workflows.",
          ],
        },
        {
          title: "Application protections",
          body: [
            "We apply authentication and authorization controls within the product to restrict workspace access by role and organization boundary. Sensitive operations are logged and monitored to support auditing and troubleshooting.",
            "External integrations are scoped to the permissions needed for their intended function, and credentials are handled through secured configuration rather than embedded in client-facing code.",
          ],
        },
        {
          title: "Response and disclosure",
          body: [
            "Argos investigates credible security reports, prioritizes remediation according to severity, and works to contain incidents that may affect confidentiality, integrity, or availability.",
            "If we determine that a customer-impacting incident requires notice, we will communicate through the appropriate customer contacts and provide material updates as additional facts are confirmed.",
          ],
        },
      ]}
      title="Security Policy"
    />
  );
}
