"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Sparkles, X, BookOpen } from "lucide-react";

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

export default function TestVocabPage() {
  const [isAILoading, setIsAILoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);

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
      setSuggestion(suggestion);
      
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

  const onSubmit = (data: VocabularyFormData) => {
    console.log("Form data:", data);
    console.log("Tags:", tags);
    console.log("AI Suggestion:", suggestion);
    alert("Form submitted! Check console for data.");
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white mb-4">
            <BookOpen className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Test AI Vocabulary Form
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Test the enhanced AI suggestions with comprehensive vocabulary data.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information Card */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
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
            <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
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
            <Card className="shadow-lg border-0 bg-gradient-to-br from-yellow-50/50 to-orange-50/50 dark:from-yellow-950/20 dark:to-orange-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
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
            <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
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
                type="submit" 
                className="flex-1 h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Test Submit (Console Log)
              </Button>
            </div>
          </form>
        </Form>

        {/* AI Suggestion Display */}
        {suggestion && (
          <Card className="shadow-lg border-0 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                AI Suggestion Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(suggestion, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
