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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Sparkles, Save, X, BookOpen, FileText } from "lucide-react";
import { NewTagDialog } from "@/components/NewTagDialog";

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
  pronunciation: string;
  part_of_speech: string;
  cefr_level: string;
  tags: string[];
  synonyms: string[];
  antonyms: string[];
  collocations: string[];
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
      // Extract synonyms, antonyms, collocations from notes
      const notes = data.notes || "";
      let synonyms: string[] = [];
      let antonyms: string[] = [];
      let collocations: string[] = [];
      let cleanNotes = notes;

      // Extract synonyms
      const synonymMatch = notes.match(/📚 Synonyms: ([^\n]+)/);
      if (synonymMatch) {
        synonyms = synonymMatch[1].split(", ").map(s => s.trim()).filter(Boolean);
        cleanNotes = cleanNotes.replace(/📚 Synonyms: [^\n]+\n?/g, "");
      }

      // Extract antonyms
      const antonymMatch = notes.match(/🔄 Antonyms: ([^\n]+)/);
      if (antonymMatch) {
        antonyms = antonymMatch[1].split(", ").map(s => s.trim()).filter(Boolean);
        cleanNotes = cleanNotes.replace(/🔄 Antonyms: [^\n]+\n?/g, "");
      }

      // Extract collocations
      const collocationMatch = notes.match(/🔗 Common Collocations: ([^\n]+)/);
      if (collocationMatch) {
        collocations = collocationMatch[1].split(", ").map(s => s.trim()).filter(Boolean);
        cleanNotes = cleanNotes.replace(/🔗 Common Collocations: [^\n]+\n?/g, "");
      }

      // Clean up extra whitespace
      cleanNotes = cleanNotes.replace(/\n\n+/g, "\n\n").trim();

      const response = await fetch("/api/vocab", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          notes: cleanNotes,
          tags,
          synonyms,
          antonyms,
          collocations,
          difficulty: data.difficulty,
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
      
      // Auto-fill all form fields with AI suggestions
      if (suggestion.meaning) {
        form.setValue("meaning", suggestion.meaning);
      }
      if (suggestion.definition) {
        form.setValue("definition", suggestion.definition);
      }
      if (suggestion.pronunciation) {
        form.setValue("pronunciation", suggestion.pronunciation);
      }
      if (suggestion.part_of_speech) {
        form.setValue("part_of_speech", suggestion.part_of_speech);
      }
      if (suggestion.cefr_level) {
        form.setValue("difficulty", suggestion.cefr_level);
      }
      
      // Auto-add AI suggested tags
      if (suggestion.tags && suggestion.tags.length > 0) {
        const newTags = suggestion.tags.filter(tag => !tags.includes(tag));
        if (newTags.length > 0) {
          setTags([...tags, ...newTags]);
        }
      }
      
      // Create notes with additional vocabulary information
      let notesContent = form.getValues("notes") || "";
      
      if (suggestion.synonyms && suggestion.synonyms.length > 0) {
        notesContent += `\n\n📚 Synonyms: ${suggestion.synonyms.join(", ")}`;
      }
      
      if (suggestion.antonyms && suggestion.antonyms.length > 0) {
        notesContent += `\n\n🔄 Antonyms: ${suggestion.antonyms.join(", ")}`;
      }
      
      if (suggestion.collocations && suggestion.collocations.length > 0) {
        notesContent += `\n\n🔗 Common Collocations: ${suggestion.collocations.join(", ")}`;
      }
      
      if (suggestion.other_meanings && suggestion.other_meanings.length > 0) {
        notesContent += `\n\n🌟 Other meanings: ${suggestion.other_meanings.join("; ")}`;
      }
      
      if (notesContent.trim()) {
        form.setValue("notes", notesContent.trim());
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Add New Vocabulary</h1>
            <p className="text-muted-foreground">
              Add a new word to your vocabulary collection
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="word"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">English Word *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter the English word" 
                          {...field} 
                          className="text-lg h-12"
                        />
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
                      <FormLabel className="text-base font-semibold">Pronunciation</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., /prəˌnʌnsiˈeɪʃən/" 
                          {...field} 
                          className="h-11"
                        />
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
                      <FormLabel className="text-base font-semibold">Part of Speech</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select part of speech" />
                          </SelectTrigger>
                        </FormControl>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Meaning & Definition Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-green-600" />
                  Meaning & Definition
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAISuggest}
                    disabled={isAILoading}
                    className="ml-auto"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isAILoading ? "Getting AI..." : "AI Suggest"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="meaning"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Vietnamese Meaning *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Nhập nghĩa tiếng Việt của từ này" 
                          className="min-h-[100px] text-base"
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
                      <FormLabel className="text-base font-semibold">English Definition</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter detailed English definition or explanation" 
                          className="min-h-[100px] text-base"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Tags & Organization Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline" className="p-0 w-5 h-5 rounded-full">
                    <span className="text-xs">🏷️</span>
                  </Badge>
                  Tags & Organization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <FormLabel className="text-base font-semibold">Tags</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag (e.g., Grammar, Business, Academic)"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={handleTagKeyPress}
                      className="flex-1 h-11"
                    />
                    <Button type="button" onClick={addTag} variant="outline" className="px-6">
                      Add
                    </Button>
                    <NewTagDialog 
                      onTagCreated={(tagName) => {
                        if (!tags.includes(tagName)) {
                          setTags([...tags, tagName]);
                        }
                      }}
                    />
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-2 px-3 py-1 text-sm">
                          🏷️ {tag}
                          <X 
                            className="h-4 w-4 cursor-pointer hover:text-red-500" 
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
                    <FormLabel className="text-base font-semibold">CEFR Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select CEFR level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A1">🟢 A1 - Beginner</SelectItem>
                          <SelectItem value="A2">🔵 A2 - Elementary</SelectItem>
                          <SelectItem value="B1">🟡 B1 - Intermediate</SelectItem>
                          <SelectItem value="B2">🟠 B2 - Upper Intermediate</SelectItem>
                          <SelectItem value="C1">🔴 C1 - Advanced</SelectItem>
                          <SelectItem value="C2">🟣 C2 - Proficient</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Additional Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Additional Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Notes & Examples</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add personal notes, example sentences, or memory tips..." 
                          className="min-h-[120px] text-base"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
                className="px-8"
              >
                Cancel
              </Button>
              <Button
                type="submit" 
                disabled={isLoading}
                className="flex-1 h-11"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Saving..." : "Save Vocabulary"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </ProtectedLayout>
  );
}
