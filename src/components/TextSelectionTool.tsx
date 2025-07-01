"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MousePointer, Check, X, AlertCircle } from "lucide-react";

interface SelectedWord {
  word: string;
  meaning?: string;
  definition?: string;
  exists?: boolean;
}

interface ExtractedWord {
  word: string;
  meaning: string;
  definition: string;
  part_of_speech?: string;
  difficulty?: string;
  selected: boolean;
}

interface TextSelectionToolProps {
  onWordAdded?: (word: SelectedWord) => void;
  onWordsExtracted?: (words: ExtractedWord[]) => void;
  mode?: 'single' | 'multiple';
}

export function TextSelectionTool({ onWordAdded, onWordsExtracted, mode = 'single' }: TextSelectionToolProps) {
  const [isSelectionMode] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string>("");
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [wordInfo, setWordInfo] = useState<SelectedWord | null>(null);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString().trim();
      
      if (mode === 'single') {
        // Single word mode
        if (selectedText.split(' ').length === 1) {
          setSelectedWord(selectedText);
          handleCheckWord(selectedText);
        } else {
          alert("Please select only one word at a time");
        }
      } else {
        // Multiple words mode
        const words = selectedText.split(/\s+/).filter(word => {
          // Only include English words (basic check)
          return /^[a-zA-Z]+$/.test(word) && word.length > 2;
        });
        
        if (words.length > 0) {
          const newWords = words.filter(word => !selectedWords.includes(word.toLowerCase()));
          if (newWords.length > 0) {
            setSelectedWords(prev => [...prev, ...newWords.map(w => w.toLowerCase())]);
            alert(`Added ${newWords.length} new words. Total: ${selectedWords.length + newWords.length} words selected.`);
          } else {
            alert("All selected words are already in the list.");
          }
        } else {
          alert("No valid English words found in selection.");
        }
      }
    } else {
      alert("Please select text first");
    }
  };

  const handleCheckWord = async (word: string) => {
    setIsLoading(true);
    try {
      // Check if word already exists in vocabulary
      const existsResponse = await fetch(`/api/vocab/check?word=${encodeURIComponent(word)}`);
      const existsData = await existsResponse.json();
      
      if (existsData.exists) {
        setWordInfo({
          word,
          exists: true
        });
        setIsLoading(false);
        return;
      }

      // Get AI suggestion for the word
      const aiResponse = await fetch(`/api/ai/suggest?word=${encodeURIComponent(word)}`);
      const aiData = await aiResponse.json();
      
      setWordInfo({
        word,
        meaning: aiData.meaning,
        definition: aiData.definition,
        exists: false
      });
    } catch (error) {
      console.error("Error checking word:", error);
      setWordInfo({
        word,
        exists: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWord = () => {
    if (wordInfo && !wordInfo.exists && onWordAdded) {
      onWordAdded(wordInfo);
      setWordInfo(null);
      setSelectedWord("");
    }
  };

  const handleCancel = () => {
    setWordInfo(null);
    setSelectedWord("");
  };

  const handleProcessMultipleWords = async () => {
    if (selectedWords.length === 0) {
      alert("Please select some words first");
      return;
    }

    setIsLoading(true);
    const processedWords: ExtractedWord[] = [];

    try {
      // Process words in batches of 5 to avoid overwhelming the API
      for (let i = 0; i < selectedWords.length; i += 5) {
        const batch = selectedWords.slice(i, i + 5);
        const batchPromises = batch.map(async (word) => {
          try {
            // Check if word already exists
            const existsResponse = await fetch(`/api/vocab/check?word=${encodeURIComponent(word)}`);
            const existsData = await existsResponse.json();
            
            if (existsData.exists) {
              return null; // Skip existing words
            }

            // Get AI suggestion
            const aiResponse = await fetch(`/api/ai/suggest?word=${encodeURIComponent(word)}`);
            const aiData = await aiResponse.json();
            
            return {
              word,
              meaning: aiData.meaning || "No meaning available",
              definition: aiData.definition || "No definition available",
              part_of_speech: "unknown",
              difficulty: "B1",
              selected: true
            };
          } catch (error) {
            console.error(`Error processing word "${word}":`, error);
            return {
              word,
              meaning: "Error getting meaning",
              definition: "Please add meaning manually",
              part_of_speech: "unknown",
              difficulty: "B1",
              selected: false
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        processedWords.push(...batchResults.filter(word => word !== null));
      }

      // setExtractedWords(processedWords); // Removed because setExtractedWords is not defined
      
      if (onWordsExtracted) {
        onWordsExtracted(processedWords);
      }
      
      alert(`Successfully processed ${processedWords.length} words. ${selectedWords.length - processedWords.length} words were skipped (already exist or failed).`);
      
    } catch (error) {
      console.error("Error processing multiple words:", error);
      alert("Failed to process some words. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearWords = () => {
    setSelectedWords([]);
  };

  const handleRemoveWord = (wordToRemove: string) => {
    setSelectedWords(prev => prev.filter(word => word !== wordToRemove));
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-cyan-50/50 to-blue-50/50 dark:from-cyan-950/20 dark:to-blue-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MousePointer className="h-5 w-5 text-cyan-500" />
          {mode === 'single' ? 'Quick Word Selection' : 'Multiple Word Selection'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>🔍 <strong>How to use:</strong></p>
          {mode === 'single' ? (
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Highlight any English word on this page</li>
              <li>Click "Get Selected Word" button</li>
              <li>AI will auto-translate to Vietnamese</li>
              <li>Add to your vocabulary collection instantly</li>
            </ol>
          ) : (
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Highlight any English text (words/phrases/sentences)</li>
              <li>Click "Add Selected Words" to collect words</li>
              <li>Repeat to collect more words from different text</li>
              <li>Click "Process All Words" to get AI translations</li>
              <li>Words will be added to Extracted Vocabulary below</li>
            </ol>
          )}
        </div>

        {mode === 'single' ? (
          <div className="flex gap-2">
            <Button
              onClick={handleTextSelection}
              disabled={isLoading}
              variant={isSelectionMode ? "default" : "outline"}
              className="flex-1"
            >
              <MousePointer className="h-4 w-4 mr-2" />
              {isLoading ? "Checking..." : "Get Selected Word"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                onClick={handleTextSelection}
                disabled={isLoading}
                variant="outline"
                className="flex-1"
              >
                <MousePointer className="h-4 w-4 mr-2" />
                Add Selected Words
              </Button>
              <Button
                onClick={handleClearWords}
                disabled={selectedWords.length === 0}
                variant="ghost"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
            
            {selectedWords.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Selected Words ({selectedWords.length}):</p>
                  <Button
                    onClick={handleProcessMultipleWords}
                    disabled={isLoading || selectedWords.length === 0}
                    size="sm"
                  >
                    {isLoading ? "Processing..." : "Process All Words"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {selectedWords.map((word, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-red-100 hover:text-red-800"
                      onClick={() => handleRemoveWord(word)}
                    >
                      {word} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Word Info Display - Single Mode */}
        {mode === 'single' && wordInfo && (
          <Card className="border-2 border-dashed border-blue-300 dark:border-blue-700">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  "{wordInfo.word}"
                </h4>
                {wordInfo.exists && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Already exists
                  </Badge>
                )}
              </div>

              {wordInfo.exists ? (
                <p className="text-sm text-muted-foreground">
                  This word is already in your vocabulary collection.
                </p>
              ) : (
                <div className="space-y-2">
                  {wordInfo.meaning && (
                    <div>
                      <label className="text-sm font-medium text-green-600 dark:text-green-400">
                        Vietnamese Meaning:
                      </label>
                      <p className="text-sm bg-green-50 dark:bg-green-950/20 p-2 rounded">
                        {wordInfo.meaning}
                      </p>
                    </div>
                  )}
                  
                  {wordInfo.definition && (
                    <div>
                      <label className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        English Definition:
                      </label>
                      <p className="text-sm bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                        {wordInfo.definition}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={handleAddWord}
                      size="sm"
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Add to Vocabulary
                    </Button>
                    <Button 
                      onClick={handleCancel}
                      variant="outline"
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {mode === 'single' && selectedWord && !wordInfo && !isLoading && (
          <div className="text-sm text-muted-foreground">
            Selected: <strong>"{selectedWord}"</strong>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
