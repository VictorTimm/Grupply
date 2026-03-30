import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CreateEventButton } from "@/app/(app)/dashboard/CreateEventButton";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-8 p-6 md:p-8">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <header className="flex items-center justify-between gap-4 rounded-[24px] bg-white px-5 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:border dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
            <GlobalSearch />
            <div className="flex shrink-0 items-center gap-2.5">
              <CreateEventButton />
              <Link
                href="/messages"
                className="rounded-2xl border border-zinc-200/90 bg-white px-4 py-2.5 text-sm text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Messages
              </Link>
              <Link
                href="/settings"
                className="rounded-2xl border border-zinc-200/90 bg-white px-4 py-2.5 text-sm text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Settings
              </Link>
            </div>
          </header>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
