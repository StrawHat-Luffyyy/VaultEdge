import { Card, CardContent } from '@/components/ui/card';

export default function AuditLogPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Audit Log</h2>
          <p className="text-sm text-muted-foreground">Review all management actions and security events</p>
        </div>
      </div>
      <Card className="border-border/50 bg-card/80">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Audit log viewer coming in Milestone 6</p>
        </CardContent>
      </Card>
    </div>
  );
}
