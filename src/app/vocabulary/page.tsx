"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { createBrowserClient } from "@/lib/supabase";
import { VocabularyCard } from "@/components/VocabularyCard";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import Link from "next/link";

interface Vocabulary {
  id: string;
  word: string;
  pronunciation?: string;
  part_of_speech?: string;
  difficulty?: string;
  cefr_level?: string;
  meaning?: string;
  definition?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  synonyms?: Array<{ synonym_text: string }>;
  antonyms?: Array<{ antonym_text: string }>;
  examples?: string[];
}

export default function VocabularyPage() {
  const { user } = useUser();
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchVocabularies = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/vocab');
      if (!response.ok) {
        throw new Error('Failed to fetch vocabularies');
      }
      
      const data = await response.json();
      
      // Process the data to include tags as an array
      const processedVocabularies = data.vocabularies?.map((vocab: any) => ({
        ...vocab,
        tags: vocab.tags || [],
        examples: vocab.example ? [vocab.example] : []
      })) || [];
      
      setVocabularies(processedVocabularies);
    } catch (err) {
      console.error('Error fetching vocabularies:', err);
      setError('Error loading vocabularies.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVocabularies();
  }, [user?.id]);

  if (isLoading) {
    return (
      <ProtectedLayout>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ProtectedLayout>
    );
  }

  if (error) {
    return (
      <ProtectedLayout>
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
          <Button onClick={fetchVocabularies} className="mt-4">
            Try Again
          </Button>
        </div>
      </ProtectedLayout>
    );
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
                onDelete={fetchVocabularies}
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
