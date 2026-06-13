import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Landing page — minimal for M1, will be expanded in later milestones.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      {/* Gradient glow effect */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-8 px-4 text-center">
        {/* Logo / Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 ring-1 ring-primary/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-primary"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5Z" />
              <path d="m2 17 10 5 10-5" />
              <path d="m2 12 10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">VaultEdge</h1>
        </div>

        {/* Tagline */}
        <p className="max-w-[500px] text-lg text-muted-foreground">
          The unified governance layer for LLM infrastructure. Route, monitor, secure, and optimize
          every AI API call.
        </p>

        {/* CTA */}
        <div className="flex gap-4">
          <Link href="/sign-in">
            <Button size="lg" variant="default">
              Sign In
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button size="lg" variant="outline">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 pt-4">
          {[
            'API Gateway',
            'Cost Analytics',
            'Rate Limiting',
            'Provider Failover',
            'Semantic Caching',
            'Audit Logs',
          ].map((feature) => (
            <span
              key={feature}
              className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground"
            >
              {feature}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
