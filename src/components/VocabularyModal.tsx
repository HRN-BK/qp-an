'use client';

import { useState, useEffect } from 'react';
import { X, Volume2, BookOpen, Lightbulb, Link, Tag, Calendar, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Vocabulary {
  id: number;
  word: string;
  meaning: string;
  definition: string;
  example: string;
  pronunciation: string;
  notes?: string;
  cefr_level: string;
  mastery_level: number;
  last_reviewed?: string;
  next_review?: string;
  tags?: Array<{ name: string }>;
  synonyms?: Array<{ synonym_text: string }>;
  antonyms?: Array<{ antonym_text: string }>;
  collocations?: Array<{
    collocation_text: string;
    collocation_meaning?: string;
    example_sentence?: string;
  }>;
  audio_url?: string;
  pronunciation_ipa?: string;
}

interface VocabularyModalProps {
  vocabulary: Vocabulary | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function VocabularyModal({ vocabulary, isOpen, onClose }: VocabularyModalProps) {
  const [dragStartY, setDragStartY] = useState(0);
  const [modalY, setModalY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setIsAnimating(true);
      // Slide in from bottom
      setModalY(window.innerHeight);
      setTimeout(() => {
        setModalY(0);
        setTimeout(() => setIsAnimating(false), 300);
      }, 10);
    } else {
      document.body.style.overflow = 'unset';
      setModalY(0);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartY(e.clientY - modalY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newY = e.clientY - dragStartY;
    setModalY(Math.max(0, newY));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsAnimating(true);
    
    if (modalY > 200) {
      // Slide out to bottom
      setModalY(window.innerHeight);
      setTimeout(() => {
        onClose();
        setIsAnimating(false);
      }, 300);
    } else {
      // Snap back to top
      setModalY(0);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStartY(e.touches[0].clientY - modalY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const newY = e.touches[0].clientY - dragStartY;
    setModalY(Math.max(0, newY));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsAnimating(true);
    
    if (modalY > 200) {
      // Slide out to bottom
      setModalY(window.innerHeight);
      setTimeout(() => {
        onClose();
        setIsAnimating(false);
      }, 300);
    } else {
      // Snap back to top
      setModalY(0);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const playAudio = () => {
    if (vocabulary?.audio_url) {
      const audio = new Audio(vocabulary.audio_url);
      audio.play().catch(console.error);
    } else {
      // Fallback to text-to-speech
      const utterance = new SpeechSynthesisUtterance(vocabulary?.word || '');
      utterance.lang = 'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  const getMasteryColor = (level: number) => {
    const colors = [
      'bg-gray-500',    // Level 0
      'bg-red-500',     // Level 1
      'bg-orange-500',  // Level 2
      'bg-yellow-500',  // Level 3
      'bg-blue-500',    // Level 4
      'bg-green-500',   // Level 5 (Mastered)
    ];
    return colors[Math.min(level, 5)];
  };

  // Handle close with slide animation
  const handleClose = () => {
    setIsAnimating(true);
    setModalY(window.innerHeight);
    setTimeout(() => {
      onClose();
      setIsAnimating(false);
    }, 300);
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen || !vocabulary) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className={`relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-t-xl shadow-2xl max-h-[90vh] overflow-hidden ${
          isAnimating ? 'transition-transform duration-300 ease-out' : ''
        }`}
        style={{ transform: `translateY(${modalY}px)` }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div
          className="flex justify-center p-2 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {vocabulary.word}
            </h2>
            {vocabulary.pronunciation_ipa && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                /{vocabulary.pronunciation_ipa}/
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={playAudio}
              className="h-8 w-8 p-0"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {vocabulary.cefr_level}
            </Badge>
            <Badge className={`text-xs text-white ${getMasteryColor(vocabulary.mastery_level)}`}>
              Level {vocabulary.mastery_level}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-4 space-y-4">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-blue-500" />
                Meaning & Definition
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Vietnamese Meaning</h4>
                <p className="text-gray-900 dark:text-white">{vocabulary.meaning}</p>
              </div>
              
              {vocabulary.definition && (
                <div>
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">English Definition</h4>
                  <p className="text-gray-900 dark:text-white">{vocabulary.definition}</p>
                </div>
              )}

              {vocabulary.example && (
                <div>
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Example</h4>
                  <p className="italic text-gray-800 dark:text-gray-200">"{vocabulary.example}"</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Synonyms & Antonyms */}
          {(vocabulary.synonyms?.length || vocabulary.antonyms?.length) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Synonyms & Antonyms
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {vocabulary.synonyms?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Synonyms</h4>
                    <div className="flex flex-wrap gap-2">
                      {vocabulary.synonyms.map((syn, index) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {syn.synonym_text}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {vocabulary.antonyms?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Antonyms</h4>
                    <div className="flex flex-wrap gap-2">
                      {vocabulary.antonyms.map((ant, index) => (
                        <Badge key={index} variant="destructive" className="text-sm">
                          {ant.antonym_text}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Collocations */}
          {vocabulary.collocations?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Link className="h-5 w-5 text-purple-500" />
                  Collocations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vocabulary.collocations.map((col, index) => (
                    <div key={index} className="border-l-4 border-purple-200 dark:border-purple-800 pl-3">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {col.collocation_text}
                      </p>
                      {col.collocation_meaning && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {col.collocation_meaning}
                        </p>
                      )}
                      {col.example_sentence && (
                        <p className="text-sm italic text-gray-700 dark:text-gray-300">
                          "{col.example_sentence}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {vocabulary.tags?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Tag className="h-5 w-5 text-green-500" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {vocabulary.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Study Progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-indigo-500" />
                Study Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Mastery Level:</span>
                <span className="font-medium">Level {vocabulary.mastery_level}/5</span>
              </div>
              {vocabulary.last_reviewed && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Last Reviewed:</span>
                  <span className="text-sm">
                    {new Date(vocabulary.last_reviewed).toLocaleDateString()}
                  </span>
                </div>
              )}
              {vocabulary.next_review && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Next Review:</span>
                  <span className="text-sm">
                    {new Date(vocabulary.next_review).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {vocabulary.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {vocabulary.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
