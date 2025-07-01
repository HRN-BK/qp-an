"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Loader2, BookOpen, Sparkles, FileText } from "lucide-react";

const DIFFICULTY_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const PARTS_OF_SPEECH = [
  'noun', 'verb', 'adjective', 'adverb', 'pronoun', 
  'preposition', 'conjunction', 'interjection', 'article'
];

interface VocabularyEditFormProps {
  vocabulary: {
    id: string;
    word: string;
    pronunciation?: string;
    part_of_speech?: string;
    difficulty?: string;
    notes?: string;
    vocabulary_meanings?: Array<{
      id: string;
      meaning: string;
      example_sentence?: string;
      translation?: string;
    }>;
    vocabulary_tags?: Array<{
      tag_id: string;
      tags: {
        id: string;
        name: string;
        color?: string;
      };
    }>;
  };
  allTags: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
}

export function VocabularyEditForm({ vocabulary, allTags }: VocabularyEditFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    word: vocabulary.word,
    pronunciation: vocabulary.pronunciation || '',
    part_of_speech: vocabulary.part_of_speech || '',
    difficulty: vocabulary.difficulty || '',
    notes: vocabulary.notes || '',
    meaning: vocabulary.vocabulary_meanings?.[0]?.meaning || '',
    definition: vocabulary.vocabulary_meanings?.[0]?.example_sentence || '',
  });

  // Selected tags state
  const [selectedTags, setSelectedTags] = useState<string[]>(
    vocabulary.vocabulary_tags?.map(vt => vt.tags.name) || []
  );

  const [newTag, setNewTag] = useState('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = (tagName: string) => {
    if (tagName && !selectedTags.includes(tagName)) {
      setSelectedTags(prev => [...prev, tagName]);
    }
  };

  const removeTag = (tagName: string) => {
    setSelectedTags(prev => prev.filter(tag => tag !== tagName));
  };

  const handleAddNewTag = () => {
    if (newTag.trim()) {
      addTag(newTag.trim());
      setNewTag('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/vocab/${vocabulary.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tags: selectedTags,
        }),
      });

      if (response.ok) {
        router.push(`/vocabulary/${vocabulary.id}`);
        router.refresh();
      } else {
        alert('Failed to update vocabulary');
      }
    } catch (error) {
      console.error('Error updating vocabulary:', error);
      alert('Failed to update vocabulary');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="word" className="text-base font-semibold">English Word *</Label>
            <Input
              id="word"
              value={formData.word}
              onChange={(e) => handleInputChange('word', e.target.value)}
              required
              placeholder="Enter the English word"
              className="text-lg h-12"
            />
          </div>
            
            <div className="space-y-2">
              <Label htmlFor="pronunciation" className="text-base font-semibold">Pronunciation</Label>
              <Input
                id="pronunciation"
                value={formData.pronunciation}
                onChange={(e) => handleInputChange('pronunciation', e.target.value)}
                placeholder="e.g., /prəˌnʌnsiˈeɪʃən/"
                className="h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="part_of_speech" className="text-base font-semibold">Part of Speech</Label>
              <Select
                value={formData.part_of_speech}
                onValueChange={(value) => handleInputChange('part_of_speech', value)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select part of speech" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="noun">🏷️ Noun</SelectItem>
                  <SelectItem value="verb">⚡ Verb</SelectItem>
                  <SelectItem value="adjective">🎨 Adjective</SelectItem>
                  <SelectItem value="adverb">🚀 Adverb</SelectItem>
                  <SelectItem value="preposition">🔗 Preposition</SelectItem>
                  <SelectItem value="conjunction">🤝 Conjunction</SelectItem>
                  <SelectItem value="interjection">❗ Interjection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty" className="text-base font-semibold">CEFR Level</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) => handleInputChange('difficulty', value)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select CEFR level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A1">🟢 A1 - Beginner</SelectItem>
                  <SelectItem value="A2">🔵 A2 - Elementary</SelectItem>
                  <SelectItem value="B1">🟡 B1 - Intermediate</SelectItem>
                  <SelectItem value="B2">🟠 B2 - Upper Intermediate</SelectItem>
                  <SelectItem value="C1">🔴 C1 - Advanced</SelectItem>
                  <SelectItem value="C2">🟣 C2 - Proficient</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-600" />
            Meaning & Definition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meaning">Vietnamese Meaning *</Label>
            <Input
              id="meaning"
              value={formData.meaning}
              onChange={(e) => handleInputChange('meaning', e.target.value)}
              required
              placeholder="Enter Vietnamese meaning"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="definition">English Definition/Example</Label>
            <Textarea
              id="definition"
              value={formData.definition}
              onChange={(e) => handleInputChange('definition', e.target.value)}
              placeholder="Enter English definition or example sentence"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional notes or context"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-red-500"
                  onClick={() => removeTag(tag)}
                />
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add new tag"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNewTag();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={handleAddNewTag}>
              Add
            </Button>
          </div>

          {allTags.length > 0 && (
            <div>
              <Label>Existing Tags (click to add):</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {allTags
                  .filter(tag => !selectedTags.includes(tag.name))
                  .map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => addTag(tag.name)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Update Vocabulary
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/vocabulary/${vocabulary.id}`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
