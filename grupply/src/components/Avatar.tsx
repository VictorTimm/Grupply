type AvatarProps = {
  src: string | null | undefined;
  initials: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  shape?: "circle" | "squircle";
};

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-[15px]",
  xl: "h-20 w-20 text-xl",
} as const;

const tints = [
  "bg-iris-wash text-iris-deep",
  "bg-ember-wash text-ember-deep",
  "bg-sage/15 text-sage",
  "bg-surface-sunk text-ink-soft",
];

function tintFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return tints[Math.abs(hash) % tints.length];
}

export function Avatar({
  src,
  initials,
  size = "md",
  className = "",
  shape = "circle",
}: AvatarProps) {
  const sizeClass = sizeClasses[size];
  const radius = shape === "squircle" ? "rounded-[12px]" : "rounded-full";

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`${sizeClass} shrink-0 ${radius} object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center ${radius} font-semibold font-display tracking-tight ${tintFor(initials || "?")} ${className}`}
    >
      {initials}
    </div>
  );
}
