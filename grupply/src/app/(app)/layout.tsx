import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CreateEventButton } from "@/app/(app)/dashboard/CreateEventButton";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-[1200px] gap-10 px-5 md:px-8">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 -mx-5 flex items-center gap-6 border-b border-border bg-canvas/90 px-5 py-4 backdrop-blur md:-mx-8 md:px-8">
            <GlobalSearch />
            <div className="ml-auto flex shrink-0 items-center gap-3">
              <CreateEventButton />
            </div>
          </header>
          <main className="min-w-0 flex-1 py-10 md:py-12">{children}</main>
        </div>
      </div>
    </div>
  );
}
