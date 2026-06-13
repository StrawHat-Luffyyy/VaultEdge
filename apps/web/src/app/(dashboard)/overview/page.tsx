import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Dashboard overview — stub page for M1.
 * Will be populated with real analytics in M4.
 */
export default function OverviewPage() {
  const stats = [
    { label: 'Total Requests', value: '—', change: null },
    { label: 'Total Tokens', value: '—', change: null },
    { label: 'Total Cost', value: '—', change: null },
    { label: 'Active API Keys', value: '—', change: null },
  ];

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                No data yet — start sending requests through the gateway
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-7 w-7 text-primary"
            >
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold">Welcome to VaultEdge</h3>
          <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
            Configure your first LLM provider, create an API key, and start routing requests
            through the gateway to see your analytics here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
