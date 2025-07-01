// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Mock authentication for testing
Cypress.Commands.add('mockAuth', () => {
  cy.window().then((win) => {
    win.localStorage.setItem('mock-user', JSON.stringify({
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User'
    }))
  })
})

// Mock API responses for testing
Cypress.Commands.add('mockVocabAPI', () => {
  cy.intercept('GET', '/api/vocab/due', {
    fixture: 'vocabularies.json'
  }).as('getDueVocab')
  
  cy.intercept('POST', '/api/vocab/review', {
    statusCode: 200,
    body: { success: true, masteryDelta: 1 }
  }).as('submitReview')
})

declare global {
  namespace Cypress {
    interface Chainable {
      mockAuth(): Chainable<void>
      mockVocabAPI(): Chainable<void>
    }
  }
}
