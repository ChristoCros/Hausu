// cypress/e2e/weather.cy.js

describe('Météo Agricole', () => {
  beforeEach(() => {
    // Clear localStorage to start with a clean state
    cy.clearLocalStorage();
    // Intercept API requests
    cy.intercept('GET', '/api/shelly/live*').as('getLive');
    cy.intercept('GET', '/api/shelly?*').as('getHistory');
    
    // We do not strictly mock the open-meteo API here, but we could to prevent flakiness
    cy.visit('/');
    cy.wait('@getLive');
    cy.wait('@getHistory');
    
    // Switch to MÉTÉO AGRICOLE tab in the sidebar
    cy.contains('MÉTÉO AGRICOLE').click();
  });

  it('affiche le tableau de bord météo avec le bon design', () => {
    // Wait for the component to load and remove the spinner
    cy.contains('Prévisions Météo Agricole', { timeout: 10000 }).should('be.visible');
    
    // Verify Header Layout & Styles
    cy.get('.weather-header')
      .should('have.css', 'display', 'flex')
      .and('have.css', 'justify-content', 'space-between');

    // Verify Main Grid structure
    cy.get('.weather-grid')
      .should('have.css', 'display', 'grid')
      .and('have.css', 'gap', '20px');

    // Verify day tabs
    cy.get('.weather-day-tab').first()
      .should('have.css', 'display', 'flex')
      .and('have.css', 'flex-direction', 'column')
      .and('have.css', 'align-items', 'center')
      .and('have.css', 'cursor', 'pointer');
      
    // Verify Agricultural table styles
    cy.get('.agri-table')
      .should('have.css', 'width')
      .and('not.equal', '0px');

    // Verify Panel backgrounds
    cy.get('.panel').first()
      .should('have.css', 'border-radius', '16px')
      .and('have.css', 'background-color')
      .and('include', 'rgba(16, 18, 35, 0.45)'); // var(--panel-bg)
  });
});
