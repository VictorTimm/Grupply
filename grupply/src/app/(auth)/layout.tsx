import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid bg-canvas text-ink md:grid-cols-[5fr_7fr]">
      {/* Brand pane */}
      <aside className="relative hidden overflow-hidden border-r border-border bg-surface md:flex md:flex-col">
        <div className="flex items-center gap-2 px-10 py-8">
          <div className="h-6 w-6 rounded-[6px] bg-ember" aria-hidden />
          <span className="font-display text-[18px] font-medium tracking-tight">
            Grupply
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-center px-10 pb-20 pr-16">
          <span className="eyebrow mb-5">For teams who show up</span>
          <h2 className="font-display text-[56px] leading-[0.98] tracking-tight text-ink">
            Where teammates
            <br />
            <span className="italic text-iris-deep">turn into</span>
            <br />
            <span className="ink-underline">after-work crews.</span>
          </h2>
          <p className="mt-8 max-w-sm text-[14px] leading-relaxed text-muted">
            Discover the hobbies in your office. Find a climbing partner on
            tuesday, a book club on thursday, a run in the park on saturday.
          </p>

          <div className="mt-10 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[
                "bg-ember",
                "bg-iris",
                "bg-sage",
                "bg-clay",
              ].map((c, i) => (
                <div
                  key={i}
                  className={`h-8 w-8 rounded-full border-2 border-surface ${c}`}
                />
              ))}
            </div>
            <span className="text-[12px] text-muted">
              42 new events this week
            </span>
          </div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-40 h-72 w-72 rounded-full bg-ember-wash blur-3xl opacity-70"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 bottom-10 h-60 w-60 rounded-full bg-iris-wash blur-3xl opacity-70"
        />

        <div className="relative px-10 py-6 text-[11px] uppercase tracking-[0.14em] text-muted border-t border-border">
          Culture, by people who&rsquo;d rather not email each other.
        </div>
      </aside>

      {/* Form pane */}
      <main className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-6 py-5 md:hidden">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-[5px] bg-ember" aria-hidden />
            <span className="font-display text-[16px] font-medium">Grupply</span>
          </div>
          <Link
            href="/login"
            className="text-[12px] uppercase tracking-[0.14em] text-muted"
          >
            Sign in
          </Link>
        </div>

        <div className="flex flex-1 items-start justify-center px-6 py-10 md:items-center md:px-12 md:py-16">
          <div className="w-full max-w-[440px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
