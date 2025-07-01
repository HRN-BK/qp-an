describe('Game Flow', () => {
  beforeEach(() => {
    cy.mockAuth();
    cy.mockVocabAPI();
    cy.visit('/game');
  });

  it('displays the first vocabulary word', () => {
    cy.wait('@getDueVocab');
    cy.contains('apple').should('be.visible');
  });

  it('correctly processes a correct answer', () => {
    cy.wait('@getDueVocab');

    // Simulate typing the correct answer
    cy.get('input[name="answer"]').type('apple');
    cy.get('button[type="submit"]').click();

    // Check response
    cy.wait('@submitReview');
    cy.get('@submitReview').its('response.statusCode').should('eq', 200);
    
    // Check for updated state
    cy.contains('Correct!').should('be.visible');
  });

  it('correctly processes an incorrect answer', () => {
    cy.wait('@getDueVocab');

    // Simulate typing an incorrect answer
    cy.get('input[name="answer"]').type('wrong-answer');
    cy.get('button[type="submit"]').click();

    // Check response
    cy.wait('@submitReview');
    cy.get('@submitReview').its('response.statusCode').should('eq', 200);

    // Check for updated state
    cy.contains('Sorry, that is incorrect.').should('be.visible');
  });

  it('advances to the next word after answering', () => {
    cy.wait('@getDueVocab');

    // Simulate correct answer
    cy.get('input[name="answer"]').type('apple');
    cy.get('button[type="submit"]').click();
    
    // Proceed to next word
    cy.contains('Next').click();

    // Check the next vocabulary word
    cy.contains('beautiful').should('be.visible');
  });

  it('should lower mastery level after 2 incorrect answers', () => {
    cy.wait('@getDueVocab');

    // Simulate typing an incorrect answer twice
    cy.get('input[name="answer"]').type('wrong-answer');
    cy.get('button[type="submit"]').click();
    cy.contains('Try Again').click(); // Retry
    cy.get('input[name="answer"]').type('wrong-answer');
    cy.get('button[type="submit"]').click();

    // Check response
    cy.wait('@submitReview');
    cy.get('@submitReview').its('response.statusCode').should('eq', 200);

    // Verify mastery level change by checking updated message or UI indicator
    cy.contains('Mastery level decreased').should('be.visible');
  })
});
