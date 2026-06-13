import { Card, CardContent } from '@/components/ui/card';

export default function ProvidersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Providers</h2>
          <p className="text-sm text-muted-foreground">Configure LLM provider connections and failover</p>
        </div>
      </div>
      <Card className="border-border/50 bg-card/80">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Provider configuration coming in Milestone 2</p>
        </CardContent>
      </Card>
    </div>
  );
}
