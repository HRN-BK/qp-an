import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface VocabularyCardProps {
  vocabulary: {
    id: string;
    word: string;
    pronunciation?: string;
    part_of_speech?: string;
    difficulty?: number;
    notes?: string;
    created_at: string;
  };
}

export function VocabularyCard({ vocabulary }: VocabularyCardProps) {
  // Placeholder for main meaning - in a real app this would come from vocabulary_meanings
  const mainMeaning = "Definition will be loaded from vocabulary_meanings table";
  
  // Placeholder tags - in a real app this would come from vocabulary_tags join
  const tags = ["example", "beginner"];

  const difficultyColors = {
    1: "bg-green-100 text-green-800",
    2: "bg-blue-100 text-blue-800", 
    3: "bg-yellow-100 text-yellow-800",
    4: "bg-orange-100 text-orange-800",
    5: "bg-red-100 text-red-800",
  };

  return (
    <Link href={`/vocabulary/${vocabulary.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{vocabulary.word}</CardTitle>
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
            <p className="text-sm text-muted-foreground">
              /{vocabulary.pronunciation}/
            </p>
          )}
          {vocabulary.part_of_speech && (
            <Badge variant="outline" className="w-fit">
              {vocabulary.part_of_speech}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-3 line-clamp-2">
            {mainMeaning}
          </p>
          
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
