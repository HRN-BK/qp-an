# Audio Playback Utility

A comprehensive audio playback utility for vocabulary pronunciation with Web Speech API fallback and iOS autoplay restriction handling.

## Features

- **Primary Audio URL Support**: Play audio files with automatic preloading
- **Web Speech API Fallback**: Text-to-speech when audio files aren't available
- **iOS Autoplay Handling**: Automatic detection and management of autoplay restrictions
- **Audio Caching**: Efficient memory management with audio file caching
- **Configurable Options**: Customize rate, pitch, volume, and language
- **Cross-Origin Support**: Handle CORS for external audio files
- **Automatic Fallback Chain**: Audio file → Web Speech API

## Basic Usage

```typescript
import { playPronunciation } from '@/lib/audio-utils';

// Simple usage with just a word
await playPronunciation('hello');

// With audio URL
await playPronunciation('hello', 'https://example.com/hello.mp3');

// With options
await playPronunciation('hello', audioUrl, {
  rate: 0.8,
  pitch: 1.0,
  volume: 1.0,
  lang: 'en-US'
});
```

## Advanced Usage

### Preloading Audio Files

```typescript
import { preloadAudio } from '@/lib/audio-utils';

// Preload single audio file
await preloadAudio('https://example.com/hello.mp3');

// Preload multiple audio files
await preloadAudio([
  'https://example.com/hello.mp3',
  'https://example.com/world.mp3'
]);
```

### Managing User Interaction (iOS)

```typescript
import { 
  isUserInteractionDetected, 
  setUserInteractionDetected 
} from '@/lib/audio-utils';

// Check if user interaction has been detected
const canPlayAudio = isUserInteractionDetected();

// Manually set user interaction (call on button click)
const handlePlayButton = () => {
  setUserInteractionDetected();
  playPronunciation('hello');
};
```

### Cache Management

```typescript
import { clearAudioCache, getAudioManager } from '@/lib/audio-utils';

// Clear all cached audio
clearAudioCache();

// Get cached audio element for advanced controls
const audioManager = getAudioManager();
const audioElement = audioManager.getCachedAudio('https://example.com/hello.mp3');
```

## React Component Integration

### Basic Component

```tsx
import { playPronunciation, setUserInteractionDetected } from '@/lib/audio-utils';

function VocabularyCard({ word, audioUrl }) {
  const handlePlay = async () => {
    setUserInteractionDetected(); // Important for iOS
    await playPronunciation(word, audioUrl);
  };

  return (
    <button onClick={handlePlay}>
      🔊 Play {word}
    </button>
  );
}
```

### Component with Error Handling

```tsx
import { useState } from 'react';
import { playPronunciation, setUserInteractionDetected } from '@/lib/audio-utils';

function PronunciationButton({ word, audioUrl }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);

  const handlePlay = async () => {
    setIsPlaying(true);
    setError(null);
    
    try {
      setUserInteractionDetected();
      const success = await playPronunciation(word, audioUrl, {
        rate: 0.8,
        lang: 'en-US'
      });
      
      if (!success) {
        setError('Playback failed');
      }
    } catch (err) {
      setError('Audio error occurred');
    } finally {
      setIsPlaying(false);
    }
  };

  return (
    <div>
      <button 
        onClick={handlePlay} 
        disabled={isPlaying}
      >
        {isPlaying ? 'Playing...' : `🔊 ${word}`}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

## PlaybackOptions Interface

```typescript
interface PlaybackOptions {
  rate?: number;    // Speech rate (0.1 - 10, default: 0.8)
  pitch?: number;   // Speech pitch (0 - 2, default: 1)
  volume?: number;  // Audio volume (0 - 1, default: 1)
  lang?: string;    // Language code (default: 'en-US')
}
```

## iOS Autoplay Restrictions

The utility automatically handles iOS autoplay restrictions:

1. **User Interaction Detection**: Automatically detects when user has interacted with the page
2. **Manual Override**: Use `setUserInteractionDetected()` when user clicks a play button
3. **Fallback Behavior**: Falls back to Web Speech API if audio playback is restricted

### Best Practices for iOS

```tsx
// Always call setUserInteractionDetected() in click handlers
const handleUserClick = () => {
  setUserInteractionDetected();
  playPronunciation(word, audioUrl);
};

// Check interaction status before auto-playing
useEffect(() => {
  if (isUserInteractionDetected()) {
    // Safe to auto-play audio
    playPronunciation(word, audioUrl);
  }
}, []);
```

## Error Handling

The utility handles various error scenarios:

- **Network errors**: Audio file loading failures
- **CORS errors**: Cross-origin restrictions
- **Speech API errors**: Web Speech API failures
- **iOS restrictions**: Autoplay policy violations

```typescript
try {
  const success = await playPronunciation(word, audioUrl);
  if (!success) {
    console.log('All playback methods failed');
  }
} catch (error) {
  console.error('Playback error:', error);
}
```

## Performance Optimization

### Preloading Strategy

```typescript
// Preload audio for current session vocabulary
useEffect(() => {
  const audioUrls = vocabularies
    .filter(v => v.audioUrl)
    .map(v => v.audioUrl);
    
  preloadAudio(audioUrls);
}, [vocabularies]);
```

### Memory Management

```typescript
// Clear cache when component unmounts or session ends
useEffect(() => {
  return () => {
    clearAudioCache();
  };
}, []);
```

## Browser Compatibility

- **HTML5 Audio**: All modern browsers
- **Web Speech API**: Chrome, Safari, Firefox, Edge
- **AudioContext**: All modern browsers
- **iOS Support**: Safari 11+, requires user interaction

## API Reference

### Core Functions

- `playPronunciation(word, audioUrl?, options?)`: Main playback function
- `preloadAudio(urls)`: Preload audio files
- `clearAudioCache()`: Clear audio cache
- `isUserInteractionDetected()`: Check interaction status
- `setUserInteractionDetected()`: Set interaction status
- `getAudioManager()`: Get manager instance for advanced usage

### Manager Methods

- `audioManager.preloadMultiple(urls)`: Preload multiple files
- `audioManager.getCachedAudio(url)`: Get cached audio element
- `audioManager.clearCache()`: Clear cache
- `audioManager.isUserInteractionDetected()`: Check interaction status

## Integration Examples

The utility is already integrated into:

- `FlashCard.tsx`: Pronunciation playback in flashcards
- `StudyGame.tsx`: Audio playback in listening mode
- `ResultCard.tsx`: Post-answer pronunciation review
- `VocabularyDetailClient.tsx`: Vocabulary detail page playback

See `AudioPlaybackExample.tsx` for a complete demo component.
