import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Inter: () => ({
    variable: "--font-ui",
  }),
  Geist_Mono: () => ({
    variable: "--font-mono",
  }),
  Geist: () => ({
    variable: "--font-ui",
  }),
  Space_Grotesk: () => ({
    variable: "--font-display",
  }),
  Source_Sans_3: () => ({
    variable: "--font-body",
  }),
}));

vi.mock("next/font/local", () => ({
  default: () => ({
    variable: "--font-material-symbols",
  }),
}));

import { metadata as layoutMetadata } from "../app/layout";
import { alt as ogImageAlt, contentType as ogImageContentType, size as ogImageSize } from "../app/opengraph-image";
import { metadata as homeMetadata } from "../app/page";
import { metadata as privacyMetadata } from "../app/privacy-policy/page";
import { metadata as securityMetadata } from "../app/security-policy/page";
import { metadata as termsMetadata } from "../app/terms-of-service/page";
import { getPublicSiteUrl, HOME_DESCRIPTION, HOME_TITLE, SITE_NAME, SOCIAL_IMAGE_PATH } from "./seo/site";

describe("public page metadata", () => {
  it("exports root public metadata defaults", () => {
    const layoutTitle = layoutMetadata.title as {
      default?: string;
      template?: string;
    };

    expect(layoutMetadata.description).toBe(HOME_DESCRIPTION);
    expect(layoutTitle.default).toBe(SITE_NAME);
    expect(layoutTitle.template).toBe(`%s | ${SITE_NAME}`);
    expect(layoutMetadata.metadataBase).toBeInstanceOf(URL);
    expect(layoutMetadata.metadataBase?.toString()).toBe(new URL(getPublicSiteUrl()).toString());
  });

  it("exports canonical homepage metadata", () => {
    const homeOpenGraph = homeMetadata.openGraph as {
      title?: string;
      description?: string;
      url?: string;
      siteName?: string;
      type?: string;
      images?: unknown;
    };
    const homeTwitter = homeMetadata.twitter as {
      card?: string;
    };

    expect(homeMetadata.title).toEqual({ absolute: HOME_TITLE });
    expect(homeMetadata.description).toBe(HOME_DESCRIPTION);
    expect(homeMetadata.alternates?.canonical).toBe("/");
    expect(homeOpenGraph?.title).toBe(HOME_TITLE);
    expect(homeOpenGraph?.description).toBe(HOME_DESCRIPTION);
    expect(homeOpenGraph?.url).toBe("/");
    expect(homeOpenGraph?.siteName).toBe(SITE_NAME);
    expect(homeOpenGraph?.type).toBe("website");
    expect(homeOpenGraph?.images).toEqual([
      {
        url: SOCIAL_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "Argos sales coaching platform",
      },
    ]);
    expect(homeTwitter?.card).toBe("summary_large_image");
  });

  it("exports social preview image metadata", () => {
    expect(ogImageAlt).toBe("Argos sales coaching platform");
    expect(ogImageSize).toEqual({
      width: 1200,
      height: 630,
    });
    expect(ogImageContentType).toBe("image/png");
  });

  it("exports unique legal page metadata", () => {
    expect(privacyMetadata.title).toBe("Privacy Policy");
    expect(privacyMetadata.description).toContain("information Argos uses");
    expect(privacyMetadata.alternates?.canonical).toBe("/privacy-policy");

    expect(termsMetadata.title).toBe("Terms of Service");
    expect(termsMetadata.description).toContain("responsibilities");
    expect(termsMetadata.alternates?.canonical).toBe("/terms-of-service");

    expect(securityMetadata.title).toBe("Security Policy");
    expect(securityMetadata.description).toContain("safeguards");
    expect(securityMetadata.alternates?.canonical).toBe("/security-policy");
  });
});
