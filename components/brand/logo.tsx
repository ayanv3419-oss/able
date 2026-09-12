import { cn } from "@/lib/utils";

/**
 * Geometry for the Able mark: a rounded tile holding an "A" drawn as a
 * chevron with a dot for its crossbar. Shared so the in-app logo, the
 * favicon and the Open Graph image stay identical.
 */
export const ableMark = {
  chevron: "M8.6 24.2 16 7.8 23.4 24.2",
  dot: { cx: 16, cy: 19.6, r: 1.8 },
  radius: 8,
  strokeWidth: 3.4,
  viewBox: "0 0 32 32",
} as const;

const WORDMARK_RATIO = 0.72;
const GAP_RATIO = 0.3;

type AbleMarkProps = {
  className?: string;
  /** Accessible name. Leave unset when a visible wordmark names the logo. */
  label?: string;
  size?: number;
};

/** The tile on its own, for favicons, avatars and tight spaces. */
export function AbleMark({ className, label, size = 28 }: AbleMarkProps) {
  return (
    <svg
      aria-hidden={label ? undefined : true}
      className={className}
      height={size}
      role={label ? "img" : undefined}
      viewBox={ableMark.viewBox}
      width={size}
    >
      {label ? <title>{label}</title> : null}
      <rect fill="currentColor" height="32" rx={ableMark.radius} width="32" />
      <path
        className="stroke-background"
        d={ableMark.chevron}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ableMark.strokeWidth}
      />
      <circle
        className="fill-background"
        cx={ableMark.dot.cx}
        cy={ableMark.dot.cy}
        r={ableMark.dot.r}
      />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  /** Show the "Able" wordmark beside the mark. */
  showWordmark?: boolean;
  /** Height of the mark in pixels. The wordmark scales with it. */
  size?: number;
};

export function Logo({ className, showWordmark = true, size = 28 }: LogoProps) {
  return (
    <span
      className={cn("inline-flex items-center text-foreground", className)}
      style={{ gap: size * GAP_RATIO }}
    >
      <AbleMark label={showWordmark ? undefined : "Able"} size={size} />
      {showWordmark ? (
        <span
          className="font-semibold leading-none tracking-tight"
          style={{ fontSize: size * WORDMARK_RATIO }}
        >
          Able
        </span>
      ) : null}
    </span>
  );
}
