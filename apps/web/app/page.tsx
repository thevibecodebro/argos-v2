import type { Metadata } from "next";
import { JsonLd } from "@/components/public/json-ld";
import { LandingPage } from "@/components/public/landing-page";
import { buildHomeJsonLd } from "@/lib/seo/schema";
import { HOME_DESCRIPTION, HOME_TITLE, SOCIAL_IMAGE_PATH } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: "/",
    siteName: "Argos",
    type: "website",
    images: [
      {
        url: SOCIAL_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "Argos sales coaching platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [SOCIAL_IMAGE_PATH],
  },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={buildHomeJsonLd()} />
      <LandingPage />
    </>
  );
}
