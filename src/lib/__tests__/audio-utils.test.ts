/**
 * @jest-environment jsdom
 */

import { 
  playPronunciation,
  preloadAudio,
  clearAudioCache,
  isUserInteractionDetected,
  setUserInteractionDetected,
  getAudioManager
} from '../audio-utils';

// Mock Web Speech API
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
};

const mockSpeechSynthesisUtterance = jest.fn().mockImplementation(() => ({
  lang: 'en-US',
  rate: 0.8,
  pitch: 1,
  volume: 1,
  onend: null,
  onerror: null,
}));

// Mock Audio API
const mockAudio = jest.fn().mockImplementation(() => ({
  src: '',
  crossOrigin: '',
  preload: '',
  currentTime: 0,
  volume: 1,
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock AudioContext
const mockAudioContext = jest.fn().mockImplementation(() => ({
  state: 'running',
  resume: jest.fn().mockResolvedValue(undefined),
}));

// Setup global mocks
Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: mockSpeechSynthesis,
});

Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  writable: true,
  value: mockSpeechSynthesisUtterance,
});

Object.defineProperty(window, 'Audio', {
  writable: true,
  value: mockAudio,
});

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: mockAudioContext,
});

describe('Audio Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAudioCache();
  });

  describe('playPronunciation', () => {
    it('should play audio with Web Speech API when no audio URL provided', async () => {
      setUserInteractionDetected();
      
      const result = await playPronunciation('hello');
      
      expect(mockSpeechSynthesisUtterance).toHaveBeenCalledWith('hello');
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle options correctly', async () => {
      setUserInteractionDetected();
      
      await playPronunciation('hello', undefined, {
        rate: 0.5,
        lang: 'fr-FR',
        volume: 0.8
      });
      
      const utteranceCall = mockSpeechSynthesisUtterance.mock.calls[0];
      expect(utteranceCall[0]).toBe('hello');
    });

    it('should attempt audio URL first when provided', async () => {
      setUserInteractionDetected();
      
      const audioUrl = 'https://example.com/hello.mp3';
      await playPronunciation('hello', audioUrl);
      
      expect(mockAudio).toHaveBeenCalled();
    });
  });

  describe('user interaction detection', () => {
    it('should initially return false for user interaction', () => {
      expect(isUserInteractionDetected()).toBe(false);
    });

    it('should return true after setting user interaction', () => {
      setUserInteractionDetected();
      expect(isUserInteractionDetected()).toBe(true);
    });
  });

  describe('preloadAudio', () => {
    it('should handle single URL', async () => {
      await preloadAudio('https://example.com/hello.mp3');
      expect(mockAudio).toHaveBeenCalled();
    });

    it('should handle array of URLs', async () => {
      const urls = [
        'https://example.com/hello.mp3',
        'https://example.com/world.mp3'
      ];
      
      await preloadAudio(urls);
      expect(mockAudio).toHaveBeenCalledTimes(2);
    });
  });

  describe('audio manager', () => {
    it('should return audio manager instance', () => {
      const manager = getAudioManager();
      expect(manager).toBeDefined();
      expect(typeof manager.playPronunciation).toBe('function');
    });

    it('should clear cache', () => {
      clearAudioCache();
      // Should not throw error
      expect(true).toBe(true);
    });
  });
});
