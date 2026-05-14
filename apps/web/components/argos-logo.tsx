export const ARGOS_LOGO_SRC = "/argos_logo_background.png";
export const ARGOS_LOGO_WIDTH = 830;
export const ARGOS_LOGO_HEIGHT = 151;

type ArgosLogoProps = {
  alt?: string;
  className?: string;
  decorative?: boolean;
  imageClassName?: string;
  placement: string;
};

export function ArgosLogo({
  alt = "Argos logo",
  className,
  decorative = false,
  imageClassName,
  placement,
}: ArgosLogoProps) {
  return (
    <span className={className} data-argos-logo={placement}>
      <img
        alt={decorative ? "" : alt}
        aria-hidden={decorative ? "true" : undefined}
        className={imageClassName}
        decoding="async"
        draggable={false}
        height={ARGOS_LOGO_HEIGHT}
        src={ARGOS_LOGO_SRC}
        width={ARGOS_LOGO_WIDTH}
      />
    </span>
  );
}
