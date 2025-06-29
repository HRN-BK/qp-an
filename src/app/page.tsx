import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <Card className="p-6 text-center">
          <h1 className="text-3xl font-bold mb-4">AI Vocab</h1>
          <p className="text-muted-foreground mb-6">
            Welcome to your AI-powered vocabulary application.
          </p>
          <p className="text-sm text-muted-foreground">
            Sign in to start building your vocabulary collection.
          </p>
        </Card>
      </main>
    </div>
  );
}
