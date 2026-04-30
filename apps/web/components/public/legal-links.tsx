import Link from "next/link";

export const LEGAL_LINKS = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
  { href: "/security-policy", label: "Security Policy" },
] as const;

export function LegalFooterLinks({ className = "" }: { className?: string }) {
  return (
    <nav
      aria-label="Legal"
      className={`flex flex-wrap items-center gap-x-5 gap-y-3 text-xs uppercase tracking-[0.2em] text-[var(--forge-muted)] ${className}`.trim()}
    >
      {LEGAL_LINKS.map((link) => (
        <Link
          className="forge-focus-ring rounded transition-colors duration-150 hover:text-[var(--forge-text)]"
          href={link.href}
          key={link.href}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
