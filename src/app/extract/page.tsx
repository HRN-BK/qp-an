"use client";

import { useState } from "react";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Sparkles, Save, FileText } from "lucide-react";
import { TextSelectionTool } from "@/components/TextSelectionTool";
import { CEFRBadge } from "@/components/CEFRBadge";

interface AIDraft {
  id?: string;
  word: string;
  meaning: string;
  definition: string;
  part_of_speech?: string;
  difficulty?: string;
  selected: boolean;
}

interface ExtractedWord {
  word: string;
  meaning: string;
  definition: string;
  part_of_speech?: string;
  difficulty?: string;
  selected: boolean;
}

export default function ExtractPage() {
  const [passage, setPassage] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [drafts, setDrafts] = useState<AIDraft[]>([]);

  const handleExtract = async () => {
    if (!passage.trim()) {
      alert("Please enter a passage to extract from");
      return;
    }

    setIsExtracting(true);
    try {
      const response = await fetch("/api/ai/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ passage }),
      });

      if (!response.ok) {
        throw new Error("Failed to extract vocabulary");
      }

      const result = await response.json();
      const extractedDrafts: AIDraft[] = result.words.map((word: any) => ({
        word: word.word,
        meaning: word.meaning,
        definition: word.definition,
        part_of_speech: word.part_of_speech || "unknown",
        difficulty: word.difficulty || "B1",
        selected: true
      }));

      // Add to existing drafts, avoiding duplicates
      setDrafts(prevDrafts => {
        const existingWords = prevDrafts.map(d => d.word.toLowerCase());
        const uniqueNewDrafts = extractedDrafts.filter(draft => 
          !existingWords.includes(draft.word.toLowerCase())
        );
        return [...prevDrafts, ...uniqueNewDrafts];
      });
    } catch (error) {
      console.error("Error extracting vocabulary:", error);
      alert("Failed to extract vocabulary. Please try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setDrafts(drafts.map(draft => ({ ...draft, selected: checked })));
  };

  const handleSelectDraft = (index: number, checked: boolean) => {
    setDrafts(drafts.map((draft, i) => 
      i === index ? { ...draft, selected: checked } : draft
    ));
  };

  const handleSaveSelected = async () => {
    const selectedDrafts = drafts.filter(draft => draft.selected);
    
    if (selectedDrafts.length === 0) {
      alert("Please select at least one vocabulary to save");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/drafts/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ drafts: selectedDrafts }),
      });

      if (!response.ok) {
        throw new Error("Failed to save drafts");
      }

      const result = await response.json();
      alert(`Successfully saved ${selectedDrafts.length} vocabularies!`);
      
      // Clear the form
      setPassage("");
      setDrafts([]);
    } catch (error) {
      console.error("Error saving drafts:", error);
      alert("Failed to save vocabularies. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickWordAdd = async (wordInfo: any) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/vocab", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          word: wordInfo.word,
          meaning: wordInfo.meaning,
          definition: wordInfo.definition,
          difficulty: "B1",
          tags: ["Quick Add"]
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add vocabulary");
      }

      alert(`Successfully added "${wordInfo.word}" to your vocabulary!`);
    } catch (error) {
      console.error("Error adding word:", error);
      alert("Failed to add vocabulary. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleWordsExtracted = (extractedWords: ExtractedWord[]) => {
    // Convert ExtractedWord[] to AIDraft[] and add to existing drafts
    const newDrafts: AIDraft[] = extractedWords.map(word => ({
      word: word.word,
      meaning: word.meaning,
      definition: word.definition,
      part_of_speech: word.part_of_speech || "unknown",
      difficulty: word.difficulty || "B1",
      selected: word.selected
    }));
    
    // Add to existing drafts, avoiding duplicates
    setDrafts(prevDrafts => {
      const existingWords = prevDrafts.map(d => d.word.toLowerCase());
      const uniqueNewDrafts = newDrafts.filter(draft => 
        !existingWords.includes(draft.word.toLowerCase())
      );
      return [...prevDrafts, ...uniqueNewDrafts];
    });
  };

  const selectedCount = drafts.filter(draft => draft.selected).length;

  return (
    <ProtectedLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Extract Vocabulary</h1>
          <p className="text-muted-foreground">
            Select words from any text on this page or paste a passage to extract vocabulary
          </p>
        </div>

        {/* Multiple Word Selection Tool */}
        <TextSelectionTool 
          mode="multiple" 
          onWordsExtracted={handleWordsExtracted}
        />

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Passage Input
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste your text passage here... AI will extract vocabulary words and their meanings."
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              className="min-h-[200px]"
            />
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {passage.length} characters
              </p>
              <Button 
                onClick={handleExtract}
                disabled={isExtracting || !passage.trim()}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isExtracting ? "Extracting..." : "Extract Vocabulary"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {drafts.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Extracted Vocabulary</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedCount === drafts.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <label
                      htmlFor="select-all"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Select All ({selectedCount}/{drafts.length})
                    </label>
                  </div>
                  <Button 
                    onClick={handleSaveSelected}
                    disabled={isSaving || selectedCount === 0}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : `Save Selected (${selectedCount})`}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Word</TableHead>
                      <TableHead>Part of Speech</TableHead>
                      <TableHead>Meaning</TableHead>
                      <TableHead>Definition</TableHead>
                      <TableHead>Difficulty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drafts.map((draft, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Checkbox
                            checked={draft.selected}
                            onCheckedChange={(checked) => 
                              handleSelectDraft(index, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {draft.word}
                        </TableCell>
                        <TableCell>
                          {draft.part_of_speech && (
                            <Badge variant="outline">
                              {draft.part_of_speech}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm truncate" title={draft.meaning}>
                            {draft.meaning}
                          </p>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm truncate" title={draft.definition}>
                            {draft.definition}
                          </p>
                        </TableCell>
                        <TableCell>
                          <CEFRBadge level={draft.difficulty} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Method 1 - Text Selection:</strong></p>
              <p>1. Highlight English words/text anywhere on this page</p>
              <p>2. Click "Add Selected Words" to collect them</p>
              <p>3. Click "Process All Words" to get AI translations</p>
              <p><strong>Method 2 - Passage Extraction:</strong></p>
              <p>4. Paste text in the input area and click "Extract Vocabulary"</p>
              <p>5. Review extracted words and select the ones you want</p>
              <p>6. Click "Save Selected" to add them to your vocabulary</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedLayout>
  );
}
