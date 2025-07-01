import { auth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { VocabularyCard } from "@/components/VocabularyCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface TagDetailPageProps {
  params: Promise<{
    name: string;
  }>;
}

export default async function TagDetailPage({ params }: TagDetailPageProps) {
  const { userId } = await auth();
  
  if (!userId) {
    return <div>Please sign in to view this tag.</div>;
  }

  const resolvedParams = await params;
  const tagName = decodeURIComponent(resolvedParams.name);
  const supabase = createServerClient();

  // Get the tag info
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .select('id, name, color')
    .eq('user_id', userId)
    .eq('name', tagName)
    .single();

  if (tagError || !tag) {
    notFound();
  }

  // Get vocabularies associated with this tag
  const { data: vocabularyTags, error: vocabError } = await supabase
    .from('vocabulary_tags')
    .select(`
      vocabularies (
        id,
        word,
        meaning,
        definition,
        pronunciation,
        part_of_speech,
        difficulty,
        notes,
        created_at,
        updated_at
      )
    `)
    .eq('tag_id', tag.id)
    .order('created_at', { ascending: false, foreignTable: 'vocabularies' });

  if (vocabError) {
    console.error('Error fetching vocabularies for tag:', vocabError);
    return <div>Error loading vocabularies for this tag.</div>;
  }

  const vocabularies = vocabularyTags?.map(vt => vt.vocabularies).filter(Boolean) || [];

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/tags">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tags
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">#{tag.name}</h1>
          <Badge variant="secondary">
            {vocabularies.length} {vocabularies.length === 1 ? 'vocabulary' : 'vocabularies'}
          </Badge>
        </div>

        {vocabularies.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vocabularies.map((vocab: any) => (
              <VocabularyCard
                key={vocab.id}
                vocabulary={vocab}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No vocabularies with this tag</h3>
            <p className="text-muted-foreground mb-6">
              This tag exists but has no vocabularies associated with it yet.
            </p>
            <Link href="/vocabulary/new">
              <Button>
                Add New Vocabulary
              </Button>
            </Link>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-6 border-t">
          <Link href="/vocabulary/new">
            <Button>
              Add Vocabulary with #{tag.name}
            </Button>
          </Link>
          <Link href="/vocabulary">
            <Button variant="outline">
              View All Vocabularies
            </Button>
          </Link>
        </div>
      </div>
    </ProtectedLayout>
  );
}
