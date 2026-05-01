import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@argos-v2/ui";

type AuthenticatedPageContainerSize = "standard" | "wide";
type AuthenticatedPageContainerElement = "div" | "main" | "section";

type AuthenticatedPageContainerProps = HTMLAttributes<HTMLElement> & {
  as?: AuthenticatedPageContainerElement;
  children?: ReactNode;
  size?: AuthenticatedPageContainerSize;
};

const pageContainerSizes: Record<AuthenticatedPageContainerSize, string> = {
  standard: "max-w-7xl",
  wide: "max-w-[1600px]",
};

export function AuthenticatedPageContainer({
  as: Component = "section",
  children,
  className,
  size = "standard",
  ...props
}: AuthenticatedPageContainerProps) {
  return (
    <Component
      className={cn("mx-auto w-full flex-1 px-4 py-6 sm:px-6 lg:px-8", pageContainerSizes[size], className)}
      data-authenticated-page-container={size}
      {...props}
    >
      {children}
    </Component>
  );
}
