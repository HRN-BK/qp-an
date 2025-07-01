"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CEFRBadge } from "@/components/CEFRBadge";

interface VocabularyCardProps {
  vocabulary: {
    id: string;
    word: string;
    pronunciation?: string;
    part_of_speech?: string;
    difficulty?: string;
    notes?: string;
    created_at: string;
  };
  onDelete?: () => void;
}

export function VocabularyCard({ vocabulary, onDelete }: VocabularyCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  
  // Placeholder for main meaning - in a real app this would come from vocabulary_meanings
  const mainMeaning = "Definition will be loaded from vocabulary_meanings table";
  
  // Placeholder tags - in a real app this would come from vocabulary_tags join
  const tags = ["example", "beginner"];

  const difficultyColors = {
    'A1': "bg-green-100 text-green-800",
    'A2': "bg-blue-100 text-blue-800", 
    'B1': "bg-yellow-100 text-yellow-800",
    'B2': "bg-orange-100 text-orange-800",
    'C1': "bg-red-100 text-red-800",
    'C2': "bg-purple-100 text-purple-800",
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete "${vocabulary.word}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/vocab/${vocabulary.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete?.();
        router.refresh();
      } else {
        alert('Failed to delete vocabulary');
      }
    } catch (error) {
      console.error('Error deleting vocabulary:', error);
      alert('Failed to delete vocabulary');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/vocabulary/${vocabulary.id}/edit`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow h-full group relative">
      <Link href={`/vocabulary/${vocabulary.id}`} className="block">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{vocabulary.word}</CardTitle>
            <div className="flex items-center gap-2">
              {vocabulary.difficulty && (
                <Badge 
                  variant="secondary" 
                  className={difficultyColors[vocabulary.difficulty as keyof typeof difficultyColors]}
                >
                  {vocabulary.difficulty}
                </Badge>
              )}
            </div>
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
            <div className="flex flex-wrap gap-1 mb-3">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Link>
      
      {/* Action buttons - only show on hover */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEdit}
          className="h-8 w-8 p-0 bg-white shadow-sm hover:bg-gray-50"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="h-8 w-8 p-0 bg-white shadow-sm hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
