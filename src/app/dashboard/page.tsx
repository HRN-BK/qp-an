import { ProtectedLayout } from "@/components/ProtectedLayout";

export default function DashboardPage() {
  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your vocabulary dashboard.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Total Words</h3>
            <p className="text-2xl font-bold text-primary">0</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Words Reviewed</h3>
            <p className="text-2xl font-bold text-primary">0</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Study Streak</h3>
            <p className="text-2xl font-bold text-primary">0 days</p>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
