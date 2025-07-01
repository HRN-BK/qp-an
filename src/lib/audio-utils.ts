/**
 * Audio Playback Utility
 * 
 * Provides reliable audio pronunciation playback with:
 * - Primary audio URL support with preloading
 * - Web Speech API fallback
 * - iOS and autoplay restriction handling
 * - Audio reuse and caching
 */

interface AudioCache {
  [key: string]: HTMLAudioElement;
}

interface PlaybackOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

class AudioPlaybackManager {
  private audioCache: AudioCache = {};
  private speechSynthesisSupported: boolean = false;
  private audioContext: AudioContext | null = null;
  private userInteractionDetected: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    // Skip initialization in SSR environment
    if (typeof window === 'undefined') {
      return;
    }
    
    // Check for Web Speech API support
    this.speechSynthesisSupported = 'speechSynthesis' in window;
    
    // Set up user interaction detection for iOS autoplay restrictions
    this.setupUserInteractionDetection();
    
    // Initialize audio context for better iOS support
    this.initializeAudioContext();
  }

  private setupUserInteractionDetection() {
    if (typeof document === 'undefined') {
      return;
    }
    
    const detectInteraction = () => {
      this.userInteractionDetected = true;
      // Remove listeners after first interaction
      document.removeEventListener('click', detectInteraction);
      document.removeEventListener('touchstart', detectInteraction);
      document.removeEventListener('keydown', detectInteraction);
    };

    document.addEventListener('click', detectInteraction);
    document.addEventListener('touchstart', detectInteraction);
    document.addEventListener('keydown', detectInteraction);
  }

  private async initializeAudioContext() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    try {
      // Create audio context for better iOS support
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume context on user interaction if suspended
      const resumeContext = async () => {
        if (this.audioContext && this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      };

      document.addEventListener('click', resumeContext, { once: true });
      document.addEventListener('touchstart', resumeContext, { once: true });
    } catch (error) {
      console.warn('AudioContext not supported:', error);
    }
  }

  /**
   * Preload audio file for better performance
   */
  private async preloadAudio(audioUrl: string): Promise<HTMLAudioElement> {
    if (typeof window === 'undefined') {
      throw new Error('Audio not available in SSR environment');
    }
    
    return new Promise((resolve, reject) => {
      if (this.audioCache[audioUrl]) {
        resolve(this.audioCache[audioUrl]);
        return;
      }

      const audio = new Audio();
      
      // Set up event listeners
      const onLoad = () => {
        this.audioCache[audioUrl] = audio;
        cleanup();
        resolve(audio);
      };

      const onError = (error: ErrorEvent) => {
        cleanup();
        reject(new Error(`Failed to load audio: ${error.message}`));
      };

      const cleanup = () => {
        audio.removeEventListener('canplaythrough', onLoad);
        audio.removeEventListener('error', onError);
      };

      audio.addEventListener('canplaythrough', onLoad);
      audio.addEventListener('error', onError);
      
      // Configure audio element
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous'; // Handle CORS if needed
      audio.src = audioUrl;
    });
  }

  /**
   * Play audio using HTML5 Audio with iOS/autoplay handling
   */
  private async playHtmlAudio(audioUrl: string, options: PlaybackOptions = {}): Promise<boolean> {
    try {
      let audio: HTMLAudioElement;

      // Try to get preloaded audio or create new one
      if (this.audioCache[audioUrl]) {
        audio = this.audioCache[audioUrl];
      } else {
        audio = await this.preloadAudio(audioUrl);
      }

      // Reset audio to beginning
      audio.currentTime = 0;
      
      // Apply options
      if (options.volume !== undefined) {
        audio.volume = Math.max(0, Math.min(1, options.volume));
      }

      // Handle iOS autoplay restrictions
      if (!this.userInteractionDetected) {
        // If no user interaction yet, we need to wait or show a play button
        console.warn('User interaction required for audio playback on iOS');
        return false;
      }

      // Attempt to play
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        await playPromise;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('HTML Audio playback failed:', error);
      return false;
    }
  }

  /**
   * Play audio using Web Speech API
   */
  private async playSpeechSynthesis(word: string, options: PlaybackOptions = {}): Promise<boolean> {
    if (!this.speechSynthesisSupported || typeof window === 'undefined') {
      return false;
    }

    return new Promise((resolve) => {
      try {
        // Cancel any ongoing speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(word);
        
        // Configure utterance
        utterance.lang = options.lang || 'en-US';
        utterance.rate = options.rate || 0.8;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;

        // Set up event listeners
        utterance.onend = () => resolve(true);
        utterance.onerror = (error) => {
          console.error('Speech synthesis error:', error);
          resolve(false);
        };

        // Start speaking
        speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('Speech synthesis failed:', error);
        resolve(false);
      }
    });
  }

  /**
   * Main method to play pronunciation
   * Tries audio URL first, falls back to speech synthesis
   */
  async playPronunciation(
    word: string, 
    audioUrl?: string, 
    options: PlaybackOptions = {}
  ): Promise<boolean> {
    let success = false;

    // First try: Use provided audio URL
    if (audioUrl) {
      try {
        success = await this.playHtmlAudio(audioUrl, options);
        if (success) {
          return true;
        }
      } catch (error) {
        console.warn('Audio URL playback failed, trying speech synthesis:', error);
      }
    }

    // Second try: Use Web Speech API
    if (this.speechSynthesisSupported) {
      try {
        success = await this.playSpeechSynthesis(word, options);
        if (success) {
          return true;
        }
      } catch (error) {
        console.warn('Speech synthesis failed:', error);
      }
    }

    console.error('All audio playback methods failed');
    return false;
  }

  /**
   * Preload multiple audio files
   */
  async preloadMultiple(audioUrls: string[]): Promise<void> {
    const preloadPromises = audioUrls.map(url => 
      this.preloadAudio(url).catch(error => 
        console.warn(`Failed to preload ${url}:`, error)
      )
    );
    
    await Promise.allSettled(preloadPromises);
  }

  /**
   * Clear audio cache to free memory
   */
  clearCache(): void {
    Object.values(this.audioCache).forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    this.audioCache = {};
  }

  /**
   * Get cached audio element (useful for advanced controls)
   */
  getCachedAudio(audioUrl: string): HTMLAudioElement | null {
    return this.audioCache[audioUrl] || null;
  }

  /**
   * Check if user interaction has been detected (required for iOS)
   */
  isUserInteractionDetected(): boolean {
    return this.userInteractionDetected;
  }

  /**
   * Force user interaction detection (call this when user explicitly clicks play)
   */
  setUserInteractionDetected(): void {
    this.userInteractionDetected = true;
  }
}

// Create singleton instance
const audioManager = new AudioPlaybackManager();

/**
 * Main utility function for playing pronunciation
 * This is the function that components should use
 */
export async function playPronunciation(
  word: string,
  audioUrl?: string,
  options: PlaybackOptions = {}
): Promise<boolean> {
  return audioManager.playPronunciation(word, audioUrl, options);
}

/**
 * Preload audio files for better performance
 */
export async function preloadAudio(audioUrls: string | string[]): Promise<void> {
  const urls = Array.isArray(audioUrls) ? audioUrls : [audioUrls];
  return audioManager.preloadMultiple(urls);
}

/**
 * Clear audio cache
 */
export function clearAudioCache(): void {
  audioManager.clearCache();
}

/**
 * Check if user interaction is detected (important for iOS)
 */
export function isUserInteractionDetected(): boolean {
  return audioManager.isUserInteractionDetected();
}

/**
 * Set user interaction as detected (call when user clicks play button)
 */
export function setUserInteractionDetected(): void {
  audioManager.setUserInteractionDetected();
}

/**
 * Get the audio manager instance for advanced usage
 */
export function getAudioManager(): AudioPlaybackManager {
  return audioManager;
}

// Export types for TypeScript users
export type { PlaybackOptions };
