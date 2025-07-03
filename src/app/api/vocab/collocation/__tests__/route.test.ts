import { NextRequest } from 'next/server';
import { POST } from '../route';
import { auth } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';

// Mock external dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/supabase');

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockCreateServiceClient = createServiceClient as jest.MockedFunction<typeof createServiceClient>;

describe('/api/vocab/collocation', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Supabase mock
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      upsert: jest.fn().mockReturnThis(),
    };
    mockCreateServiceClient.mockReturnValue(mockSupabaseClient);

    // Default auth success
    mockAuth.mockResolvedValue({ userId: 'test-user-123' });
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const request = new NextRequest('http://localhost/api/vocab/collocation', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          text: 'beautiful scenery'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    const createRequest = (body: any) => new NextRequest('http://localhost/api/vocab/collocation', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    it('should return 400 when vocabularyId is missing', async () => {
      const request = createRequest({
        text: 'beautiful scenery'
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('vocabularyId and text are required');
    });

    it('should return 400 when text is missing', async () => {
      const request = createRequest({
        vocabularyId: '1'
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('vocabularyId and text are required');
    });

    it('should return 400 when both vocabularyId and text are missing', async () => {
      const request = createRequest({});

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('vocabularyId and text are required');
    });
  });

  describe('Vocabulary Access Verification', () => {
    it('should return 404 when vocabulary is not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      });

      const request = new NextRequest('http://localhost/api/vocab/collocation', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '999',
          text: 'beautiful scenery'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.error).toBe('Vocabulary not found or not accessible');
    });

    it('should return 404 when vocabulary belongs to different user', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      });

      const request = new NextRequest('http://localhost/api/vocab/collocation', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          text: 'beautiful scenery'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
      
      // Verify vocabulary lookup with user_id filter
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('vocabularies');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', '1');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'test-user-123');
    });

    it('should proceed when vocabulary exists and belongs to user', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: '1' },
        error: null
      });

      mockSupabaseClient.upsert.mockResolvedValue({
        data: { id: 'collocation-123' },
        error: null
      });

      const request = new NextRequest('http://localhost/api/vocab/collocation', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          text: 'beautiful scenery'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Collocation Upsert Operations', () => {
    beforeEach(() => {
      // Mock vocabulary lookup success
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: '1' },
        error: null
      });
    });

    it('should successfully insert new collocation', async () => {
      mockSupabaseClient.upsert.mockResolvedValue({
        data: { id: 'collocation-123' },
        error: null
      });

      const request = new NextRequest('http://localhost/api/vocab/collocation', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          text: 'beautiful scenery'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.id).toBe('collocation-123');

      // Verify upsert was called with correct parameters
      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
        {
          vocabulary_id: '1',
          text: 'beautiful scenery',
        },
        {
          onConflict: 'vocabulary_id,text',
          ignoreDuplicates: false
        }
      );
    });

    it('should handle upsert operation for existing collocation', async () => {
      mockSupabaseClient.upsert.mockResolvedValue({
        data: { id: 'existing-collocation-456' },
        error: null
      });

      const request = new NextRequest('http://localhost/api/vocab/collocation', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          text: 'beautiful day'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.id).toBe('existing-collocation-456');
    });

    it('should return 500 when upsert operation fails', async () => {
      mockSupabaseClient.upsert.mockResolvedValue({
        data: null,
        error: { message: 'Database constraint violation' }
      });

      const request = new NextRequest('http://localhost/api/vocab/collocation', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          text: 'beautiful scenery'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Failed to save collocation');
    });
  });

  describe('Data Integrity & Edge Cases', () => {
    beforeEach(() => {
      // Mock vocabulary lookup success
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: '1' },
        error: null
      });
    });

    it('should handle empty text strings', async () => {
      const request = new NextRequest('http://localhost/api/vocab/collocation', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          text: ''
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('vocabularyId and text are required');
    });

    it('should handle whitespace-only text', async () => {
      const request = new NextRequest('http://localhost/api/vocab/collocation', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          text: '   '
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should handle special characters in collocation text', async () => {
      mockSupabaseClient.upsert.mockResolvedValue({
        data: { id: 'collocation-special-123' },
        error: null
      });

      const request = new NextRequest('http://localhost/api/vocab/collocation', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          text: 'café-style décor'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);

      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
        {
          vocabulary_id: '1',
          text: 'café-style décor',
        },
        {
          onConflict: 'vocabulary_id,text',
          ignoreDuplicates: false
        }
      );
    });

    it('should handle long collocation text', async () => {
      mockSupabaseClient.upsert.mockResolvedValue({
        data: { id: 'collocation-long-123' },
        error: null
      });

      const longText = 'a very long and detailed collocation phrase that might test the system limits';
      
      const request = new NextRequest('http://localhost/api/vocab/collocation', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          text: longText
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      
      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
        {
          vocabulary_id: '1',
          text: longText,
        },
        {
          onConflict: 'vocabulary_id,text',
          ignoreDuplicates: false
        }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected database errors during vocabulary lookup', async () => {
      mockSupabaseClient.single.mockRejectedValue(new Error('Database connection error'));

      const request = new NextRequest('http://localhost/api/vocab/collocation', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          text: 'beautiful scenery'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should handle unexpected errors during upsert operation', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: '1' },
        error: null
      });

      mockSupabaseClient.upsert.mockRejectedValue(new Error('Network timeout'));

      const request = new NextRequest('http://localhost/api/vocab/collocation', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          text: 'beautiful scenery'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should handle malformed JSON in request body', async () => {
      const request = new NextRequest('http://localhost/api/vocab/collocation', {
        method: 'POST',
        body: 'invalid json'
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Database Query Optimization', () => {
    it('should use selective field queries for vocabulary verification', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: '1' },
        error: null
      });

      mockSupabaseClient.upsert.mockResolvedValue({
        data: { id: 'collocation-123' },
        error: null
      });

      const request = new NextRequest('http://localhost/api/vocab/collocation', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          text: 'beautiful scenery'
        })
      });

      await POST(request);

      // Verify that only 'id' field is selected for vocabulary verification (efficient query)
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('id');
    });

    it('should include select() call in upsert chain for returned data', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: '1' },
        error: null
      });

      mockSupabaseClient.upsert.mockResolvedValue({
        data: { id: 'collocation-123' },
        error: null
      });

      const request = new NextRequest('http://localhost/api/vocab/collocation', {
        method: 'POST',
        body: JSON.stringify({
          vocabularyId: '1',
          text: 'beautiful scenery'
        })
      });

      await POST(request);

      // Verify that select() and single() are chained after upsert to get the result
      expect(mockSupabaseClient.select).toHaveBeenCalled();
      expect(mockSupabaseClient.single).toHaveBeenCalled();
    });
  });
});
