"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Save, X } from "lucide-react";

const vocabularySchema = z.object({
  word: z.string().min(1, "Word is required"),
  pronunciation: z.string().optional(),
  part_of_speech: z.string().optional(),
  meaning: z.string().min(1, "Meaning is required"),
  definition: z.string().optional(),
  difficulty: z.string().optional(),
  notes: z.string().optional(),
});

type VocabularyFormData = z.infer<typeof vocabularySchema>;

interface AISuggestion {
  meaning: string;
  definition: string;
  other_meanings: string[];
}

export default function NewVocabularyPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const router = useRouter();

  const form = useForm<VocabularyFormData>({
    resolver: zodResolver(vocabularySchema),
    defaultValues: {
      word: "",
      pronunciation: "",
      part_of_speech: "",
      meaning: "",
      definition: "",
      difficulty: "",
      notes: "",
    },
  });

  const onSubmit = async (data: VocabularyFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/vocab", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          tags,
          difficulty: data.difficulty ? parseInt(data.difficulty) : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create vocabulary");
      }

      const result = await response.json();
      router.push(`/vocabulary/${result.id}`);
    } catch (error) {
      console.error("Error creating vocabulary:", error);
      alert("Failed to create vocabulary. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAISuggest = async () => {
    const word = form.getValues("word");
    if (!word.trim()) {
      alert("Please enter a word first");
      return;
    }

    setIsAILoading(true);
    try {
      const response = await fetch(`/api/ai/suggest?word=${encodeURIComponent(word)}`);
      if (!response.ok) {
        throw new Error("Failed to get AI suggestion");
      }

      const suggestion: AISuggestion = await response.json();
      
      // Fill in the form with AI suggestions
      if (suggestion.meaning) {
        form.setValue("meaning", suggestion.meaning);
      }
      if (suggestion.definition) {
        form.setValue("definition", suggestion.definition);
      }
    } catch (error) {
      console.error("Error getting AI suggestion:", error);
      alert("Failed to get AI suggestion. Please try again.");
    } finally {
      setIsAILoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <ProtectedLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Add New Vocabulary</h1>
          <p className="text-muted-foreground">
            Create a new vocabulary entry for your collection.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="word"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Word *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the word" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pronunciation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pronunciation</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., /prəˌnʌnsiˈeɪʃən/" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="part_of_speech"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Part of Speech</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select part of speech" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="noun">Noun</SelectItem>
                      <SelectItem value="verb">Verb</SelectItem>
                      <SelectItem value="adjective">Adjective</SelectItem>
                      <SelectItem value="adverb">Adverb</SelectItem>
                      <SelectItem value="preposition">Preposition</SelectItem>
                      <SelectItem value="conjunction">Conjunction</SelectItem>
                      <SelectItem value="interjection">Interjection</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="meaning"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meaning *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter the main meaning" 
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="definition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Definition</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter a detailed definition" 
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Tags</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                />
                <Button type="button" onClick={addTag} variant="outline">
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="difficulty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Difficulty Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 - Beginner</SelectItem>
                      <SelectItem value="2">2 - Elementary</SelectItem>
                      <SelectItem value="3">3 - Intermediate</SelectItem>
                      <SelectItem value="4">4 - Advanced</SelectItem>
                      <SelectItem value="5">5 - Expert</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes or examples" 
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleAISuggest}
                disabled={isAILoading}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isAILoading ? "Getting AI Suggestion..." : "AI Suggest"}
              </Button>
              
              <Button type="submit" disabled={isLoading} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </ProtectedLayout>
  );
}
