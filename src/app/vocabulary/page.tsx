import { auth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { VocabularyCard } from "@/components/VocabularyCard";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

interface Vocabulary {
  id: string;
  word: string;
  pronunciation?: string;
  part_of_speech?: string;
  difficulty?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default async function VocabularyPage() {
  const { userId } = await auth();
  
  if (!userId) {
    return <div>Please sign in to view vocabularies.</div>;
  }

  const supabase = createServerClient();
  
  const { data: vocabularies, error } = await supabase
    .from('vocabularies')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching vocabularies:', error);
    return <div>Error loading vocabularies.</div>;
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Vocabulary</h1>
            <p className="text-muted-foreground">
              {vocabularies?.length || 0} words in your collection
            </p>
          </div>
        </div>

        {vocabularies && vocabularies.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vocabularies.map((vocab) => (
              <VocabularyCard
                key={vocab.id}
                vocabulary={vocab}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No vocabularies yet</h3>
            <p className="text-muted-foreground mb-6">
              Start building your vocabulary collection by adding your first word.
            </p>
            <Link href="/vocabulary/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add First Word
              </Button>
            </Link>
          </div>
        )}

        {/* Floating Add Button */}
        <Link href="/vocabulary/new">
          <Button
            size="lg"
            className="fixed bottom-6 right-6 rounded-full shadow-lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add
          </Button>
        </Link>
      </div>
    </ProtectedLayout>
  );
}
