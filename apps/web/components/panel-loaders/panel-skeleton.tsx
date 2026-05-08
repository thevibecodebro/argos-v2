import { ForgeSkeleton } from "@/components/forge";

export function PanelSkeleton({
  className = "",
  lines = 5,
}: {
  className?: string;
  lines?: number;
}) {
  return <ForgeSkeleton className={className} lines={lines} />;
}
