describe('AI Feedback Modes - Context Write & Context Fill', () => {
  beforeEach(() => {
    cy.mockAuth();
    cy.mockVocabAPI();
    cy.visit('/');
    
    // Navigate to study mode
    cy.get('[data-testid="start-study"]', { timeout: 10000 }).should('be.visible').click();
  });

  describe('Context Write Mode', () => {
    beforeEach(() => {
      // Force context_write mode by intercepting the game setup
      cy.window().then((win) => {
        // Mock the mode selection to always return context_write
        if (win.localStorage) {
          win.localStorage.setItem('force-mode', 'context_write');
        }
      });
    });

    it('should display context write interface correctly', () => {
      // Wait for the game to load and check for context_write mode indicators
      cy.contains('Write a sentence using this word:', { timeout: 10000 }).should('be.visible');
      
      // Should show the vocabulary word
      cy.get('[data-testid="target-word"]').should('be.visible');
      
      // Should show context hints
      cy.contains('Context:').should('be.visible');
      cy.contains('Vietnamese:').should('be.visible');
      
      // Should show textarea for sentence input
      cy.get('textarea[placeholder="Write your sentence here..."]').should('be.visible');
      
      // Should show submit button
      cy.get('button[type="submit"]').should('contain', 'Submit').should('be.enabled');
    });

    it('should handle sentence submission and show AI feedback', () => {
      cy.contains('Write a sentence using this word:', { timeout: 10000 }).should('be.visible');
      
      const testSentence = 'The beautiful sunset painted the sky with vibrant colors.';
      
      // Type a sentence
      cy.get('textarea[placeholder="Write your sentence here..."]')
        .type(testSentence);
      
      // Submit the sentence
      cy.get('button[type="submit"]').click();
      
      // Wait for AI feedback API call
      cy.wait('@getAIFeedback').then((interception) => {
        expect(interception.request.body).to.deep.include({
          mode: 'context_write',
          userSentence: testSentence
        });
      });
      
      // Should show feedback card
      cy.get('[data-testid="ai-feedback-card"]', { timeout: 10000 }).should('be.visible');
      
      // Should display score
      cy.get('[data-testid="ai-score"]').should('contain', '8');
      
      // Should display feedback text
      cy.get('[data-testid="ai-feedback"]').should('contain', 'Excellent usage');
      
      // Should show suggestions
      cy.get('[data-testid="ai-suggestions"]').should('be.visible');
      cy.contains('Try using more descriptive language').should('be.visible');
      
      // Should show collocations
      cy.get('[data-testid="ai-collocations"]').should('be.visible');
      cy.contains('beautiful scenery').should('be.visible');
      cy.contains('beautiful music').should('be.visible');
    });

    it('should allow saving collocations from feedback', () => {
      cy.contains('Write a sentence using this word:', { timeout: 10000 }).should('be.visible');
      
      // Submit a sentence to get feedback
      cy.get('textarea[placeholder="Write your sentence here..."]')
        .type('The beautiful landscape took my breath away.');
      cy.get('button[type="submit"]').click();
      
      // Wait for feedback to appear
      cy.wait('@getAIFeedback');
      cy.get('[data-testid="ai-feedback-card"]', { timeout: 5000 }).should('be.visible');
      
      // Click save button on a collocation
      cy.get('[data-testid="save-collocation-button"]').first().click();
      
      // Should trigger collocation save API
      cy.wait('@saveCollocation').then((interception) => {
        expect(interception.request.body).to.have.property('text');
        expect(interception.request.body).to.have.property('vocabularyId');
      });
      
      // Should show success message
      cy.contains('Collocation saved!').should('be.visible');
    });

    it('should handle low score feedback appropriately', () => {
      cy.contains('Write a sentence using this word:', { timeout: 10000 }).should('be.visible');
      
      // Type a short, poor sentence to trigger low score
      const shortSentence = 'Nice.';
      
      cy.get('textarea[placeholder="Write your sentence here..."]')
        .type(shortSentence);
      cy.get('button[type="submit"]').click();
      
      cy.wait('@getAIFeedback');
      
      // Should show lower score and appropriate feedback
      cy.get('[data-testid="ai-score"]', { timeout: 5000 }).should('contain', '5');
      cy.get('[data-testid="ai-feedback"]').should('contain', 'Good attempt, but could be improved');
      
      // Should still show suggestions
      cy.get('[data-testid="ai-suggestions"]').should('be.visible');
    });

    it('should progress to next question after viewing feedback', () => {
      cy.contains('Write a sentence using this word:', { timeout: 10000 }).should('be.visible');
      
      // Submit sentence and view feedback
      cy.get('textarea[placeholder="Write your sentence here..."]')
        .type('The beautiful garden was full of flowers.');
      cy.get('button[type="submit"]').click();
      
      cy.wait('@getAIFeedback');
      cy.get('[data-testid="ai-feedback-card"]', { timeout: 5000 }).should('be.visible');
      
      // Click next button
      cy.get('button').contains('Next').click();
      
      // Should advance to next vocabulary or show completion
      cy.url().should('not.contain', 'loading');
      
      // Should either show next word or completion screen
      cy.get('body').should('satisfy', ($body) => {
        return $body.text().includes('Write a sentence') || 
               $body.text().includes('Quiz Complete') ||
               $body.text().includes('Study Session Complete');
      });
    });
  });

  describe('Context Fill Mode', () => {
    beforeEach(() => {
      // Force context_fill mode
      cy.window().then((win) => {
        if (win.localStorage) {
          win.localStorage.setItem('force-mode', 'context_fill');
        }
      });
    });

    it('should display context fill interface correctly', () => {
      // Wait for the game to load and check for context_fill mode indicators
      cy.contains('Complete the sentence with the appropriate word:', { timeout: 10000 })
        .should('be.visible');
      
      // Should show generated sentence with blank or loading state
      cy.get('body').should('satisfy', ($body) => {
        return $body.text().includes('Generating sentence') ||
               $body.text().includes('______') ||
               $body.text().includes('Error:');
      });
      
      // Should show contextual hints
      cy.contains('Contextual Hints:').should('be.visible');
      cy.contains('Vietnamese:').should('be.visible');
      
      // Should show input field for answer
      cy.get('input[placeholder="Type the missing word..."]').should('be.visible');
      
      // Should show submit button
      cy.get('button[type="submit"]').should('contain', 'Submit').should('be.enabled');
    });

    it('should handle sentence generation and completion', () => {
      cy.contains('Complete the sentence with the appropriate word:', { timeout: 10000 })
        .should('be.visible');
      
      // If sentence generation is triggered, wait for it
      cy.get('body').then(($body) => {
        if ($body.text().includes('Generating sentence')) {
          cy.wait('@generateSentence');
        }
      });
      
      // Type the answer
      cy.get('input[placeholder="Type the missing word..."]')
        .type('beautiful');
      
      // Submit the answer
      cy.get('button[type="submit"]').click();
      
      // Should trigger AI feedback for context_fill mode
      cy.wait('@getAIFeedback').then((interception) => {
        expect(interception.request.body).to.deep.include({
          mode: 'context_fill'
        });
        expect(interception.request.body.userSentence).to.include('beautiful');
      });
      
      // Should show feedback
      cy.get('[data-testid="ai-feedback-card"]', { timeout: 10000 }).should('be.visible');
      cy.get('[data-testid="ai-score"]').should('be.visible');
    });

    it('should handle sentence generation errors gracefully', () => {
      // Mock sentence generation error
      cy.intercept('POST', '/api/vocab/generate-sentence', {
        statusCode: 500,
        body: { error: 'Failed to generate sentence' }
      }).as('generateSentenceError');
      
      cy.contains('Complete the sentence with the appropriate word:', { timeout: 10000 })
        .should('be.visible');
      
      // Should show error state with fallback
      cy.contains('Error:', { timeout: 5000 }).should('be.visible');
      cy.contains('Fallback:').should('be.visible');
      
      // Should still allow input
      cy.get('input[placeholder="Type the missing word..."]').should('be.visible');
    });

    it('should show pronunciation hints when available', () => {
      cy.contains('Complete the sentence with the appropriate word:', { timeout: 10000 })
        .should('be.visible');
      
      // Should show pronunciation in hints section if available
      cy.get('[data-testid="pronunciation-hint"]').should('exist');
    });
  });

  describe('Streak and Progress Tracking', () => {
    it('should increment streak on successful AI feedback submissions', () => {
      cy.contains('Write a sentence using this word:', { timeout: 10000 }).should('be.visible');
      
      // Check initial streak (if visible)
      cy.get('[data-testid="current-streak"]').then(($streak) => {
        const initialStreak = parseInt($streak.text()) || 0;
        
        // Submit a good sentence
        cy.get('textarea[placeholder="Write your sentence here..."]')
          .type('The beautiful sunset created a perfect romantic atmosphere.');
        cy.get('button[type="submit"]').click();
        
        cy.wait('@getAIFeedback');
        cy.get('[data-testid="ai-feedback-card"]', { timeout: 5000 }).should('be.visible');
        
        // Progress to next question
        cy.get('button').contains('Next').click();
        
        // Check if streak increased (if still on same session)
        cy.get('[data-testid="current-streak"]').should(($newStreak) => {
          const newStreakValue = parseInt($newStreak.text()) || 0;
          expect(newStreakValue).to.be.gte(initialStreak);
        });
      });
    });

    it('should track and display session progress', () => {
      // Should show progress indicators
      cy.get('[data-testid="session-progress"]').should('be.visible');
      cy.get('[data-testid="questions-completed"]').should('be.visible');
      
      // Complete a question
      cy.contains('Write a sentence using this word:', { timeout: 10000 }).should('be.visible');
      cy.get('textarea[placeholder="Write your sentence here..."]')
        .type('The beautiful architecture impressed all visitors.');
      cy.get('button[type="submit"]').click();
      
      cy.wait('@getAIFeedback');
      cy.get('[data-testid="ai-feedback-card"]', { timeout: 5000 }).should('be.visible');
      cy.get('button').contains('Next').click();
      
      // Progress should be updated
      cy.get('[data-testid="session-progress"]')
        .should('contain', '1'); // At least 1 question completed
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle AI feedback API errors gracefully', () => {
      // Mock API error
      cy.intercept('POST', '/api/vocab/ai-feedback', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('getAIFeedbackError');
      
      cy.contains('Write a sentence using this word:', { timeout: 10000 }).should('be.visible');
      
      cy.get('textarea[placeholder="Write your sentence here..."]')
        .type('Test sentence for error handling.');
      cy.get('button[type="submit"]').click();
      
      cy.wait('@getAIFeedbackError');
      
      // Should show error message
      cy.contains('Unable to get feedback at this time').should('be.visible');
      
      // Should still allow progression
      cy.get('button').contains('Next').should('be.visible');
    });

    it('should handle collocation save failures', () => {
      // Mock collocation save error
      cy.intercept('POST', '/api/vocab/collocation', {
        statusCode: 500,
        body: { error: 'Failed to save' }
      }).as('saveCollocationError');
      
      cy.contains('Write a sentence using this word:', { timeout: 10000 }).should('be.visible');
      
      // Get feedback first
      cy.get('textarea[placeholder="Write your sentence here..."]')
        .type('The beautiful landscape was breathtaking.');
      cy.get('button[type="submit"]').click();
      
      cy.wait('@getAIFeedback');
      cy.get('[data-testid="ai-feedback-card"]', { timeout: 5000 }).should('be.visible');
      
      // Try to save collocation
      cy.get('[data-testid="save-collocation-button"]').first().click();
      
      cy.wait('@saveCollocationError');
      
      // Should show error message
      cy.contains('Failed to save collocation').should('be.visible');
    });

    it('should validate input length and content', () => {
      cy.contains('Write a sentence using this word:', { timeout: 10000 }).should('be.visible');
      
      // Try submitting empty input
      cy.get('button[type="submit"]').click();
      
      // Should show validation message or prevent submission
      cy.get('textarea[placeholder="Write your sentence here..."]').should('have.focus');
      
      // Try submitting very short input
      cy.get('textarea[placeholder="Write your sentence here..."]').type('Hi');
      cy.get('button[type="submit"]').click();
      
      // Should either prevent submission or handle gracefully
      cy.get('body').should('satisfy', ($body) => {
        return $body.text().includes('Please write a longer sentence') ||
               $body.text().includes('feedback') ||
               $body.find('textarea').is(':focus');
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should be keyboard navigable', () => {
      cy.contains('Write a sentence using this word:', { timeout: 10000 }).should('be.visible');
      
      // Tab navigation should work
      cy.get('body').tab();
      cy.focused().should('match', 'textarea, input, button');
      
      // Enter key should submit when focused on input
      cy.get('textarea[placeholder="Write your sentence here..."]')
        .type('The beautiful day brought joy to everyone.')
        .type('{enter}');
      
      // Should trigger submission (unless prevented for UI reasons)
      cy.wait('@getAIFeedback');
    });

    it('should have proper ARIA labels and semantic structure', () => {
      cy.contains('Write a sentence using this word:', { timeout: 10000 }).should('be.visible');
      
      // Check for semantic elements
      cy.get('textarea[placeholder="Write your sentence here..."]')
        .should('have.attr', 'aria-label')
        .or('have.attr', 'aria-describedby');
      
      // Check for proper heading structure
      cy.get('h1, h2, h3').should('exist');
      
      // Form elements should have labels
      cy.get('textarea, input').each(($el) => {
        cy.wrap($el).should('satisfy', ($input) => {
          return $input.attr('aria-label') || 
                 $input.attr('aria-describedby') ||
                 $input.closest('label').length > 0;
        });
      });
    });

    it('should display loading states appropriately', () => {
      cy.contains('Write a sentence using this word:', { timeout: 10000 }).should('be.visible');
      
      cy.get('textarea[placeholder="Write your sentence here..."]')
        .type('The beautiful artwork displayed incredible detail.');
      cy.get('button[type="submit"]').click();
      
      // Should show loading state while waiting for AI feedback
      cy.get('[data-testid="loading-feedback"]').should('be.visible');
      
      cy.wait('@getAIFeedback');
      
      // Loading should be replaced with feedback
      cy.get('[data-testid="loading-feedback"]').should('not.exist');
      cy.get('[data-testid="ai-feedback-card"]').should('be.visible');
    });
  });
});
