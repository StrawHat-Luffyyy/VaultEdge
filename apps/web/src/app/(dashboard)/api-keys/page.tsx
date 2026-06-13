import { Card, CardContent } from '@/components/ui/card';

export default function ApiKeysPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-muted-foreground">Manage gateway authentication keys</p>
        </div>
      </div>
      <Card className="border-border/50 bg-card/80">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">API key management coming in Milestone 2</p>
        </CardContent>
      </Card>
    </div>
  );
}
