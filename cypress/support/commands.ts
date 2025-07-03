/// <reference types="cypress" />
// ***********************************************
// Custom commands for AI Vocabulary app testing
// ***********************************************

const vocabularyFixtures = [
  {
    id: 'vocab-1',
    word: 'apple',
    meaning: 'quả táo',
    mastery_level: 1,
    next_review: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // yesterday
    consecutive_correct: 1,
    consecutive_incorrect: 0
  },
  {
    id: 'vocab-2', 
    word: 'beautiful',
    meaning: 'đẹp',
    mastery_level: 2,
    next_review: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // yesterday
    consecutive_correct: 2,
    consecutive_incorrect: 0
  },
  {
    id: 'vocab-3',
    word: 'computer',
    meaning: 'máy tính',
    mastery_level: 0,
    next_review: null,
    consecutive_correct: 0,
    consecutive_incorrect: 1
  }
];

Cypress.Commands.add('mockAuth', () => {
  // Mock authentication by setting cookies/localStorage
  cy.window().then((win) => {
    win.localStorage.setItem('user', JSON.stringify({
      id: 'test-user-id',
      email: 'test@example.com'
    }));
  });
});

Cypress.Commands.add('mockVocabAPI', () => {
  // Mock the API endpoints
  cy.intercept('GET', '/api/vocab/due', {
    statusCode: 200,
    body: vocabularyFixtures
  }).as('getDueVocab');
  
  cy.intercept('POST', '/api/review', (req) => {
    const { vocabulary_id, is_correct } = req.body;
    
    // Find the vocabulary being reviewed
    const vocab = vocabularyFixtures.find(v => v.id === vocabulary_id);
    
    if (!vocab) {
      return { statusCode: 404, body: { error: 'Vocabulary not found' } };
    }
    
    // Simulate SRS logic response
    const response = {
      success: true,
      vocabulary_id,
      is_correct,
      new_mastery_level: is_correct ? 
        Math.min(vocab.mastery_level + 1, 5) : 
        Math.max(vocab.mastery_level - 1, 0),
      next_review: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // week from now
      mastery_changed: true
    };
    
    return {
      statusCode: 200,
      body: response
    };
  }).as('submitReview');
  
  // Mock AI feedback endpoint
  cy.intercept('POST', '/api/vocab/ai-feedback', (req) => {
    const { vocabularyId, mode, userSentence } = req.body;
    
    // Simulate AI response based on input quality
    const score = userSentence.length > 10 ? 8 : 5;
    const feedback = score > 7 ? 'Excellent usage of the word in context!' : 'Good attempt, but could be improved.';
    
    return {
      statusCode: 200,
      body: {
        score,
        feedback,
        suggestions: {
          improvements: ['Try using more descriptive language', 'Consider sentence structure'],
          collocations: ['beautiful scenery', 'beautiful music', 'beautiful day']
        }
      }
    };
  }).as('getAIFeedback');
  
  // Mock collocation save endpoint
  cy.intercept('POST', '/api/vocab/collocation', {
    statusCode: 200,
    body: {
      success: true,
      id: 'collocation-123'
    }
  }).as('saveCollocation');
  
  // Mock sentence generation endpoint
  cy.intercept('POST', '/api/vocab/generate-sentence', {
    statusCode: 200,
    body: {
      sentence: 'The sunset over the ocean was absolutely ________.'
    }
  }).as('generateSentence');
  
  cy.intercept('GET', '/api/vocab/stats', {
    statusCode: 200,
    body: {
      total_vocabulary: 150,
      mastery_distribution: {
        0: 20, // NEW
        1: 30, // LEARNING
        2: 40, // YOUNG
        3: 35, // MATURE
        4: 20, // PROFICIENT
        5: 5   // MASTERED
      },
      streak: {
        current: 5,
        longest: 12
      },
      accuracy: {
        overall: 0.85,
        last_week: 0.90
      },
      weekly_progress: [
        { date: '2024-01-01', reviews: 10, correct: 8 },
        { date: '2024-01-02', reviews: 15, correct: 13 },
        { date: '2024-01-03', reviews: 12, correct: 10 }
      ]
    }
  }).as('getStats');
});

// Add type declarations
declare global {
  namespace Cypress {
    interface Chainable {
      mockAuth(): Chainable<void>
      mockVocabAPI(): Chainable<void>
    }
  }
}

export {}
