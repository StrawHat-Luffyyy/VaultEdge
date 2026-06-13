import { Card, CardContent } from '@/components/ui/card';

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Projects</h2>
          <p className="text-sm text-muted-foreground">Organize your API keys and usage by project</p>
        </div>
      </div>
      <Card className="border-border/50 bg-card/80">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Project management coming in Milestone 2</p>
        </CardContent>
      </Card>
    </div>
  );
}
