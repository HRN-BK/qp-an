"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Volume2, AlertCircle, CheckCircle } from 'lucide-react';
import { 
  playPronunciation, 
  preloadAudio, 
  isUserInteractionDetected,
  setUserInteractionDetected,
  clearAudioCache,
  type PlaybackOptions 
} from '@/lib/audio-utils';

interface ExampleVocabulary {
  word: string;
  audioUrl?: string;
  language?: string;
}

export function AudioPlaybackExample() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<string>('');
  const [userInteractionReady, setUserInteractionReady] = useState(false);

  // Example vocabulary words
  const vocabularies: ExampleVocabulary[] = [
    { 
      word: "hello", 
      audioUrl: "https://ssl.gstatic.com/dictionary/static/sounds/20220808/hello--_us_1.mp3",
      language: "en-US"
    },
    { 
      word: "world", 
      language: "en-US"
    },
    { 
      word: "pronunciation", 
      language: "en-US"
    },
    { 
      word: "bonjour", 
      language: "fr-FR"
    }
  ];

  useEffect(() => {
    // Check user interaction status periodically
    const interval = setInterval(() => {
      setUserInteractionReady(isUserInteractionDetected());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handlePlayAudio = async (vocab: ExampleVocabulary, options?: PlaybackOptions) => {
    setIsPlaying(true);
    setPlaybackStatus('Playing...');
    
    try {
      // Ensure user interaction is detected for iOS compatibility
      setUserInteractionDetected();
      
      const success = await playPronunciation(
        vocab.word, 
        vocab.audioUrl,
        {
          lang: vocab.language || 'en-US',
          rate: 0.8,
          volume: 1.0,
          ...options
        }
      );
      
      if (success) {
        setPlaybackStatus(`✅ Successfully played: ${vocab.word}`);
      } else {
        setPlaybackStatus(`❌ Failed to play: ${vocab.word}`);
      }
    } catch (error) {
      setPlaybackStatus(`❌ Error playing: ${vocab.word}`);
      console.error('Playback error:', error);
    } finally {
      setIsPlaying(false);
      
      // Clear status after 3 seconds
      setTimeout(() => setPlaybackStatus(''), 3000);
    }
  };

  const handlePreloadAll = async () => {
    setPlaybackStatus('Preloading audio files...');
    
    const audioUrls = vocabularies
      .filter(v => v.audioUrl)
      .map(v => v.audioUrl!);
    
    try {
      await preloadAudio(audioUrls);
      setPlaybackStatus('✅ All audio files preloaded');
    } catch (error) {
      setPlaybackStatus('❌ Failed to preload some audio files');
      console.error('Preload error:', error);
    }
    
    // Clear status after 3 seconds
    setTimeout(() => setPlaybackStatus(''), 3000);
  };

  const handleClearCache = () => {
    clearAudioCache();
    setPlaybackStatus('🗑️ Audio cache cleared');
    
    // Clear status after 3 seconds
    setTimeout(() => setPlaybackStatus(''), 3000);
  };

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Audio Playback Utility Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status indicators */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {userInteractionReady ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-orange-500" />
              )}
              <span className="text-sm">
                User interaction: {userInteractionReady ? 'Ready' : 'Pending'}
              </span>
            </div>
            
            {playbackStatus && (
              <Badge variant="outline" className="text-xs">
                {playbackStatus}
              </Badge>
            )}
          </div>

          {/* Control buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handlePreloadAll}
              variant="outline"
              size="sm"
            >
              Preload Audio Files
            </Button>
            
            <Button
              onClick={handleClearCache}
              variant="outline"
              size="sm"
            >
              Clear Cache
            </Button>
          </div>

          {/* Vocabulary examples */}
          <div className="grid gap-3">
            <h3 className="font-semibold">Test Pronunciation Playback:</h3>
            
            {vocabularies.map((vocab, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-lg">{vocab.word}</span>
                    <Badge variant="secondary" className="text-xs">
                      {vocab.language || 'en-US'}
                    </Badge>
                    {vocab.audioUrl && (
                      <Badge variant="outline" className="text-xs">
                        Has Audio File
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handlePlayAudio(vocab)}
                      disabled={isPlaying}
                      size="sm"
                      variant="outline"
                    >
                      <Volume2 className="h-4 w-4 mr-1" />
                      Normal
                    </Button>
                    
                    <Button
                      onClick={() => handlePlayAudio(vocab, { rate: 0.6 })}
                      disabled={isPlaying}
                      size="sm"
                      variant="outline"
                    >
                      <Volume2 className="h-4 w-4 mr-1" />
                      Slow
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Features info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Audio Utility Features:</h4>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>• Primary audio URL playback with preloading</li>
              <li>• Web Speech API fallback for any text</li>
              <li>• iOS autoplay restriction handling</li>
              <li>• Audio caching for better performance</li>
              <li>• Configurable playback options (rate, pitch, volume)</li>
              <li>• Cross-origin audio support</li>
              <li>• Automatic fallback chain (Audio → Speech API)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
