import { auth } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  
  // Fetch vocabulary with meanings
  const { data: vocabulary, error: vocabError } = await supabase
    .from('vocabularies')
    .select(`
      *,
      vocabulary_meanings (
        id,
        meaning,
        example_sentence,
        translation
      )
    `)
    .eq('id', params.id)
    .eq('user_id', userId)
    .single();

  if (vocabError || !vocabulary) {
    notFound();
  }

  const difficultyColors = {
    1: "bg-green-100 text-green-800",
    2: "bg-blue-100 text-blue-800", 
    3: "bg-yellow-100 text-yellow-800",
    4: "bg-orange-100 text-orange-800",
    5: "bg-red-100 text-red-800",
  };

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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl">{vocabulary.word}</CardTitle>
              {vocabulary.difficulty && (
                <Badge 
                  variant="secondary"
                  className={difficultyColors[vocabulary.difficulty as keyof typeof difficultyColors]}
                >
                  Level {vocabulary.difficulty}
                </Badge>
              )}
            </div>
            
            {vocabulary.pronunciation && (
              <p className="text-lg text-muted-foreground">
                /{vocabulary.pronunciation}/
              </p>
            )}
            
            {vocabulary.part_of_speech && (
              <Badge variant="outline" className="w-fit">
                {vocabulary.part_of_speech}
              </Badge>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Meanings */}
            {vocabulary.vocabulary_meanings && vocabulary.vocabulary_meanings.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Meanings</h3>
                <div className="space-y-4">
                  {vocabulary.vocabulary_meanings.map((meaning: any, index: number) => (
                    <Card key={meaning.id} className="p-4">
                      <div className="space-y-2">
                        <p className="font-medium">
                          {index + 1}. {meaning.meaning}
                        </p>
                        {meaning.example_sentence && (
                          <p className="text-sm text-muted-foreground italic">
                            Example: {meaning.example_sentence}
                          </p>
                        )}
                        {meaning.translation && (
                          <p className="text-sm text-muted-foreground">
                            Translation: {meaning.translation}
                          </p>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {vocabulary.notes && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Notes</h3>
                <Card className="p-4">
                  <p className="whitespace-pre-wrap">{vocabulary.notes}</p>
                </Card>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t pt-4 text-sm text-muted-foreground">
              <p>Created: {new Date(vocabulary.created_at).toLocaleDateString()}</p>
              {vocabulary.updated_at !== vocabulary.created_at && (
                <p>Updated: {new Date(vocabulary.updated_at).toLocaleDateString()}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  );
}
