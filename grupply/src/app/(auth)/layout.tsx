export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f6fa] text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-md rounded-[24px] border border-zinc-200/80 bg-white p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
          {children}
        </div>
      </div>
    </div>
  );
}

