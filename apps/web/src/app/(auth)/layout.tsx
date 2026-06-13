export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar p-10 lg:flex">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/8 blur-[100px]" />
          <div className="absolute -right-32 -top-32 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-primary"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5Z" />
                <path d="m2 17 10 5 10-5" />
                <path d="m2 12 10 5 10-5" />
              </svg>
            </div>
            <span className="text-xl font-bold">VaultEdge</span>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <blockquote className="space-y-2">
            <p className="text-lg leading-relaxed text-sidebar-foreground/80">
              &ldquo;VaultEdge reduced our LLM costs by 40% and gave us complete visibility into
              every API call across our engineering teams.&rdquo;
            </p>
            <footer className="text-sm text-muted-foreground">— Platform Engineering Lead</footer>
          </blockquote>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full items-center justify-center px-4 lg:w-1/2">{children}</div>
    </div>
  );
}
