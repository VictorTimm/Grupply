type DividerProps = {
  className?: string;
  orientation?: "horizontal" | "vertical";
};

export function Divider({
  className = "",
  orientation = "horizontal",
}: DividerProps) {
  if (orientation === "vertical") {
    return <span className={`w-px bg-border self-stretch ${className}`} />;
  }
  return <hr className={`border-0 h-px bg-border ${className}`} />;
}
