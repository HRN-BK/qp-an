"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Edit, Save, Trash2, RotateCcw, Frown, Smile, X, Volume2 } from "lucide-react";
import { playPronunciation, setUserInteractionDetected } from "@/lib/audio-utils";

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

interface VocabularyDetailClientProps {
  vocabulary: any;
  reviews: any[];
}

export function VocabularyDetailClient({ vocabulary, reviews }: VocabularyDetailClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tags, setTags] = useState<string[]>(
    vocabulary.vocabulary_tags?.map((vt: any) => vt.tags.name) || []
  );
  const [tagInput, setTagInput] = useState("");
  const router = useRouter();

  const form = useForm<VocabularyFormData>({
    resolver: zodResolver(vocabularySchema),
    defaultValues: {
      word: vocabulary.word,
      pronunciation: vocabulary.pronunciation || "",
      part_of_speech: vocabulary.part_of_speech || "",
      meaning: vocabulary.vocabulary_meanings?.[0]?.meaning || "",
      definition: vocabulary.vocabulary_meanings?.[0]?.example_sentence || "",
      difficulty: vocabulary.difficulty || "",
      notes: vocabulary.notes || "",
    },
  });

  const difficultyColors = {
    'A1': "bg-green-100 text-green-800",
    'A2': "bg-blue-100 text-blue-800", 
    'B1': "bg-yellow-100 text-yellow-800",
    'B2': "bg-orange-100 text-orange-800",
    'C1': "bg-red-100 text-red-800",
    'C2': "bg-purple-100 text-purple-800",
  };

  const reviewQualityLabels = {
    1: "Again",
    3: "Hard", 
    5: "Good"
  };

  const onSubmit = async (data: VocabularyFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/vocab/${vocabulary.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          tags,
          difficulty: data.difficulty,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update vocabulary");
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating vocabulary:", error);
      alert("Failed to update vocabulary. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/vocab/${vocabulary.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete vocabulary");
      }

      router.push("/vocabulary");
    } catch (error) {
      console.error("Error deleting vocabulary:", error);
      alert("Failed to delete vocabulary. Please try again.");
    }
  };

  const handleReview = async (quality: number) => {
    try {
      const response = await fetch("/api/vocab/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vocabularyId: vocabulary.id,
          rating: quality, // Use 1-5 rating for compatibility
          activityType: "manual",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit review");
      }

      router.refresh();
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
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

  const handlePlayPronunciation = async () => {
    setUserInteractionDetected(); // Ensure autoplay restrictions are managed
    await playPronunciation(vocabulary.word, vocabulary.audio_url);
  };

  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Edit Vocabulary
            <Button
              variant="ghost"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="word"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Word *</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>CEFR Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select CEFR level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A1">A1 - Beginner</SelectItem>
                        <SelectItem value="A2">A2 - Elementary</SelectItem>
                        <SelectItem value="B1">B1 - Intermediate</SelectItem>
                        <SelectItem value="B2">B2 - Upper Intermediate</SelectItem>
                        <SelectItem value="C1">C1 - Advanced</SelectItem>
                        <SelectItem value="C2">C2 - Proficient</SelectItem>
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
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? "Updating..." : "Update"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main vocabulary card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-3xl">{vocabulary.word}</CardTitle>
              {vocabulary.difficulty && (
                <Badge 
                  variant="secondary"
                  className={difficultyColors[vocabulary.difficulty as keyof typeof difficultyColors]}
                >
                  {vocabulary.difficulty}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayPronunciation}
              >
                <Volume2 className="h-4 w-4 mr-2" />
                Play
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Vocabulary</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &quot;{vocabulary.word}&quot;? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
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

          {/* Tags */}
          {vocabulary.vocabulary_tags && vocabulary.vocabulary_tags.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {vocabulary.vocabulary_tags.map((vt: any) => (
                  <Badge key={vt.tag_id} variant="secondary">
                    {vt.tags.name}
                  </Badge>
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

      {/* Review section */}
      <Card>
        <CardHeader>
          <CardTitle>Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-6">
            <Button
              variant="destructive"
              onClick={() => handleReview(1)}
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Again
            </Button>
            <Button
              variant="outline"
              onClick={() => handleReview(3)}
              className="flex-1"
            >
              <Frown className="h-4 w-4 mr-2" />
              Hard
            </Button>
            <Button
              variant="default"
              onClick={() => handleReview(5)}
              className="flex-1"
            >
              <Smile className="h-4 w-4 mr-2" />
              Good
            </Button>
          </div>

          {/* Review timeline */}
          {reviews.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Recent Reviews</h4>
              <div className="space-y-2">
                {reviews.map((review) => (
                  <div key={review.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <Badge variant={review.score >= 80 ? "default" : review.score >= 60 ? "secondary" : "destructive"}>
                        {review.score}%
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {review.review_type}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
