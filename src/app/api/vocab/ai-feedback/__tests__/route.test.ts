// Mock external dependencies
jest.mock('@/lib/auth', () => ({
  auth: jest.fn()
}));

jest.mock('@/lib/supabase', () => ({
  createServiceClient: jest.fn()
}));

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }));
});

import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';
import OpenAI from 'openai';

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockCreateServiceClient = createServiceClient as jest.MockedFunction<typeof createServiceClient>;
const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('/api/vocab/ai-feedback', () => {
  let mockSupabaseClient: any;
  let mockOpenAIInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Supabase mock
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
    };
    mockCreateServiceClient.mockReturnValue(mockSupabaseClient);

    // Setup OpenAI mock
    mockOpenAIInstance = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    };
    mockOpenAI.mockImplementation(() => mockOpenAIInstance);

    // Default auth success
    mockAuth.mockResolvedValue({ userId: 'test-user-123' });
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const request = new NextRequest('http://localhost/api/vocab/ai-feedback', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          mode: 'context_write',
          userSentence: 'This is a test sentence.'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    const createRequest = (body: any) => new NextRequest('http://localhost/api/vocab/ai-feedback', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    it('should return 400 when vocabularyId is missing', async () => {
      const request = createRequest({
        mode: 'context_write',
        userSentence: 'Test sentence'
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('vocabularyId, mode, and userSentence are required');
    });

    it('should return 400 when mode is missing', async () => {
      const request = createRequest({
        vocabularyId: '1',
        userSentence: 'Test sentence'
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('vocabularyId, mode, and userSentence are required');
    });

    it('should return 400 when userSentence is missing', async () => {
      const request = createRequest({
        vocabularyId: '1',
        mode: 'context_write'
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('vocabularyId, mode, and userSentence are required');
    });

    it('should return 400 when mode is invalid', async () => {
      const request = createRequest({
        vocabularyId: '1',
        mode: 'invalid_mode',
        userSentence: 'Test sentence'
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe("mode must be either 'context_write' or 'context_fill'");
    });

    it('should return 400 when userSentence is too short', async () => {
      const request = createRequest({
        vocabularyId: '1',
        mode: 'context_write',
        userSentence: 'Hi'
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('userSentence must be between 3 and 500 characters');
    });

    it('should return 400 when userSentence is too long', async () => {
      const request = createRequest({
        vocabularyId: '1',
        mode: 'context_write',
        userSentence: 'a'.repeat(501)
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('userSentence must be between 3 and 500 characters');
    });
  });

  describe('Vocabulary Lookup', () => {
    it('should return 404 when vocabulary is not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      });

      const request = new NextRequest('http://localhost/api/vocab/ai-feedback', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '999',
          mode: 'context_write',
          userSentence: 'This is a test sentence.'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toBe('Vocabulary not found');
    });

    it('should return 404 when vocabulary belongs to different user', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      });

      const request = new NextRequest('http://localhost/api/vocab/ai-feedback', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          mode: 'context_write',
          userSentence: 'This is a test sentence.'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
      
      // Verify user_id filter was applied
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'test-user-123');
    });
  });

  describe('OpenAI Integration & Response Parsing', () => {
    beforeEach(() => {
      // Mock vocabulary lookup success
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          id: '1',
          word: 'beautiful',
          meaning: 'đẹp',
          definition: 'pleasing the senses or mind aesthetically'
        },
        error: null
      });
    });

    it('should parse valid JSON response from OpenAI for context_write mode', async () => {
      const mockAIResponse = {
        score: 8,
        feedback: 'Great usage of the word "beautiful" in context.',
        suggestions: ['Try using more descriptive adjectives', 'Consider the word placement'],
        collocations: ['beautiful scenery', 'beautiful music', 'beautiful day']
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockAIResponse)
          }
        }]
      });

      mockSupabaseClient.insert.mockResolvedValue({
        data: { id: 'feedback-123' },
        error: null
      });

      const request = new NextRequest('http://localhost/api/vocab/ai-feedback', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          mode: 'context_write',
          userSentence: 'The sunset was beautiful tonight.'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.score).toBe(8);
      expect(data.feedback).toBe('Great usage of the word "beautiful" in context.');
      expect(data.suggestions.improvements).toEqual(['Try using more descriptive adjectives', 'Consider the word placement']);
      expect(data.suggestions.collocations).toEqual(['beautiful scenery', 'beautiful music', 'beautiful day']);
    });

    it('should parse JSON response with markdown code blocks', async () => {
      const mockAIResponse = {
        score: 7,
        feedback: 'Good attempt!',
        suggestions: ['Suggestion 1'],
        collocations: ['collocation 1']
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: `\`\`\`json\n${JSON.stringify(mockAIResponse)}\n\`\`\``
          }
        }]
      });

      mockSupabaseClient.insert.mockResolvedValue({
        data: { id: 'feedback-123' },
        error: null
      });

      const request = new NextRequest('http://localhost/api/vocab/ai-feedback', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          mode: 'context_fill',
          userSentence: 'This flower is beautiful.'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.score).toBe(7);
      expect(data.feedback).toBe('Good attempt!');
    });

    it('should handle malformed JSON response from OpenAI', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'This is not valid JSON'
          }
        }]
      });

      const request = new NextRequest('http://localhost/api/vocab/ai-feedback', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          mode: 'context_write',
          userSentence: 'The sunset was beautiful tonight.'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should sanitize and validate AI response data', async () => {
      const mockAIResponse = {
        score: 15, // Should be clamped to 10
        feedback: null, // Should use fallback
        suggestions: 'not an array', // Should become empty array
        collocations: ['col1', 'col2', 'col3', 'col4', 'col5', 'col6'] // Should be limited to 5
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockAIResponse)
          }
        }]
      });

      mockSupabaseClient.insert.mockResolvedValue({
        data: { id: 'feedback-123' },
        error: null
      });

      const request = new NextRequest('http://localhost/api/vocab/ai-feedback', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          mode: 'context_write',
          userSentence: 'The sunset was beautiful tonight.'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.score).toBe(10); // Clamped
      expect(data.feedback).toBe('Unable to provide feedback at this time.'); // Fallback
      expect(data.suggestions.improvements).toEqual([]); // Empty array
      expect(data.suggestions.collocations).toHaveLength(5); // Limited to 5
    });
  });

  describe('Database Insert Operations', () => {
    beforeEach(() => {
      // Mock vocabulary lookup success
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          id: '1',
          word: 'beautiful',
          meaning: 'đẹp',
          definition: 'pleasing the senses or mind aesthetically'
        },
        error: null
      });

      // Mock OpenAI success
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              score: 8,
              feedback: 'Great usage!',
              suggestions: ['suggestion1'],
              collocations: ['collocation1']
            })
          }
        }]
      });
    });

    it('should insert feedback data into context_feedback table', async () => {
      mockSupabaseClient.insert.mockResolvedValue({
        data: { id: 'feedback-123' },
        error: null
      });

      const request = new NextRequest('http://localhost/api/vocab/ai-feedback', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          mode: 'context_write',
          userSentence: 'The sunset was beautiful tonight.'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      // Verify database insert was called with correct data
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        user_id: 'test-user-123',
        vocabulary_id: '1',
        mode: 'context_write',
        user_sentence: 'The sunset was beautiful tonight.',
        ai_score: 8,
        ai_feedback: 'Great usage!',
        suggestions: {
          suggestions: ['suggestion1'],
          collocations: ['collocation1']
        }
      });
    });

    it('should continue with response even if database insert fails', async () => {
      mockSupabaseClient.insert.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' }
      });

      const request = new NextRequest('http://localhost/api/vocab/ai-feedback', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          mode: 'context_write',
          userSentence: 'The sunset was beautiful tonight.'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      
      // Should still return AI response even if DB insert fails
      const data = await response.json();
      expect(data.score).toBe(8);
      expect(data.feedback).toBe('Great usage!');
    });
  });

  describe('Prompt Generation for Different Modes', () => {
    beforeEach(() => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          id: '1',
          word: 'beautiful',
          meaning: 'đẹp',
          definition: 'pleasing the senses or mind aesthetically'
        },
        error: null
      });

      mockSupabaseClient.insert.mockResolvedValue({
        data: { id: 'feedback-123' },
        error: null
      });
    });

    it('should generate context_write prompt correctly', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              score: 8,
              feedback: 'Great!',
              suggestions: [],
              collocations: []
            })
          }
        }]
      });

      const request = new NextRequest('http://localhost/api/vocab/ai-feedback', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          mode: 'context_write',
          userSentence: 'The sunset was beautiful tonight.'
        })
      });

      await POST(request);

      const openAICall = mockOpenAIInstance.chat.completions.create.mock.calls[0][0];
      const userPrompt = openAICall.messages[1].content;
      
      expect(userPrompt).toContain('You are an English language teacher evaluating a student\'s use of a vocabulary word in context');
      expect(userPrompt).toContain('Word: "beautiful"');
      expect(userPrompt).toContain('Student\'s sentence: "The sunset was beautiful tonight."');
      expect(userPrompt).toContain('Whether the word is used correctly in context');
    });

    it('should generate context_fill prompt correctly', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              score: 8,
              feedback: 'Great!',
              suggestions: [],
              collocations: []
            })
          }
        }]
      });

      const request = new NextRequest('http://localhost/api/vocab/ai-feedback', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          mode: 'context_fill',
          userSentence: 'This flower is beautiful.'
        })
      });

      await POST(request);

      const openAICall = mockOpenAIInstance.chat.completions.create.mock.calls[0][0];
      const userPrompt = openAICall.messages[1].content;
      
      expect(userPrompt).toContain('You are an English language teacher evaluating a student\'s sentence completion exercise');
      expect(userPrompt).toContain('Student\'s completed sentence: "This flower is beautiful."');
      expect(userPrompt).toContain('Whether the target word fits naturally in the sentence');
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI API errors', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          id: '1',
          word: 'beautiful',
          meaning: 'đẹp',
          definition: 'pleasing the senses or mind aesthetically'
        },
        error: null
      });

      mockOpenAIInstance.chat.completions.create.mockRejectedValue(new Error('OpenAI API Error'));

      const request = new NextRequest('http://localhost/api/vocab/ai-feedback', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          mode: 'context_write',
          userSentence: 'The sunset was beautiful tonight.'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should handle empty OpenAI response', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          id: '1',
          word: 'beautiful',
          meaning: 'đẹp'
        },
        error: null
      });

      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: null
          }
        }]
      });

      const request = new NextRequest('http://localhost/api/vocab/ai-feedback', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          mode: 'context_write',
          userSentence: 'Test sentence.'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
