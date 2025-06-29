import { auth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { VocabularyDetailClient } from "@/components/VocabularyDetailClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface VocabularyDetailPageProps {
  params: {
    id: string;
  };
}

export default async function VocabularyDetailPage({
  params,
}: VocabularyDetailPageProps) {
  const { userId } = await auth();
  
  if (!userId) {
    return <div>Please sign in to view this vocabulary.</div>;
  }

  const supabase = createServerClient();
  
  // Fetch vocabulary with meanings, tags, and recent reviews
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
    .eq('id', params.id)
    .eq('user_id', userId)
    .single();

  if (vocabError || !vocabulary) {
    notFound();
  }

  // Fetch last 5 review logs
  const { data: reviews } = await supabase
    .from('review_logs')
    .select('*')
    .eq('vocabulary_id', params.id)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <ProtectedLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/vocabulary">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Vocabulary
            </Button>
          </Link>
        </div>

        <VocabularyDetailClient 
          vocabulary={vocabulary}
          reviews={reviews || []}
        />
      </div>
    </ProtectedLayout>
  );
}
