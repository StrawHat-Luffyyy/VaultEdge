import { Card, CardContent } from '@/components/ui/card';

export default function PromptsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Prompt Templates</h2>
          <p className="text-sm text-muted-foreground">Version and manage your prompt templates</p>
        </div>
      </div>
      <Card className="border-border/50 bg-card/80">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Prompt versioning coming in Milestone 5</p>
        </CardContent>
      </Card>
    </div>
  );
}
