import { notFound } from "next/navigation";
import { HomepageProductCapture } from "@/components/public/homepage-product-capture";
import {
  getHomepageProductCaptureRoute,
  isHomepageProductCaptureEnabled,
  type HomepageProductCaptureSlug,
} from "@/lib/homepage-product-capture";

export default async function HomepageProductCapturePage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  if (!isHomepageProductCaptureEnabled()) {
    notFound();
  }

  const { view } = await params;
  const route = getHomepageProductCaptureRoute(view);

  if (!route) {
    notFound();
  }

  return <HomepageProductCapture slug={route.slug as HomepageProductCaptureSlug} />;
}
