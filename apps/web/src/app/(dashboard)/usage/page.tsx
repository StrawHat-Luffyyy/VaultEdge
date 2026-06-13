import { Card, CardContent } from '@/components/ui/card';

export default function UsagePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Usage & Analytics</h2>
          <p className="text-sm text-muted-foreground">Track tokens, costs, and request metrics</p>
        </div>
      </div>
      <Card className="border-border/50 bg-card/80">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Usage analytics coming in Milestone 4</p>
        </CardContent>
      </Card>
    </div>
  );
}
