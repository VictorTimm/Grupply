import { Avatar } from "@/components/Avatar";

type Person = {
  id: string | number;
  name: string;
  initials: string;
  src?: string | null;
};

type AvatarStackProps = {
  people: Person[];
  max?: number;
  size?: "sm" | "md";
  className?: string;
};

export function AvatarStack({
  people,
  max = 5,
  size = "sm",
  className = "",
}: AvatarStackProps) {
  const visible = people.slice(0, max);
  const extra = people.length - visible.length;

  const sizeClass = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex -space-x-2">
        {visible.map((p) => (
          <div
            key={p.id}
            className="ring-2 ring-surface rounded-full"
            title={p.name}
          >
            <Avatar
              src={p.src ?? null}
              initials={p.initials}
              size={size === "sm" ? "sm" : "md"}
              className={sizeClass}
            />
          </div>
        ))}
        {extra > 0 ? (
          <div
            className={`ring-2 ring-surface ${sizeClass} rounded-full bg-iris-wash text-iris-deep flex items-center justify-center font-medium`}
          >
            +{extra}
          </div>
        ) : null}
      </div>
    </div>
  );
}
