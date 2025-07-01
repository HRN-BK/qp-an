import { auth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { VocabularyEditForm } from "@/components/VocabularyEditForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface VocabularyEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VocabularyEditPage({
  params,
}: VocabularyEditPageProps) {
  const { userId } = await auth();
  const { id } = await params;
  
  if (!userId) {
    return <div>Please sign in to edit this vocabulary.</div>;
  }

  const supabase = createServerClient();
  
  // Fetch vocabulary with meanings and tags
  const { data: vocabulary, error: vocabError } = await supabase
    .from('vocabularies')
    .select(`
      *,
      vocabulary_meanings (
        id,
        meaning,
        example_sentence,
        translation
      ),
      vocabulary_tags (
        tag_id,
        tags (
          id,
          name,
          color
        )
      )
    `)
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (vocabError || !vocabulary) {
    notFound();
  }

  // Fetch all user tags for tag selection
  const { data: allTags } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  return (
    <ProtectedLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Edit Vocabulary</h1>
            <p className="text-muted-foreground">
              Update the details for &quot;{vocabulary.word}&quot;
            </p>
          </div>
          <Link href={`/vocabulary/${id}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Word
            </Button>
          </Link>
        </div>

        <VocabularyEditForm 
          vocabulary={vocabulary}
          allTags={allTags || []}
        />
      </div>
    </ProtectedLayout>
  );
}
