// cypress/e2e/climate.cy.js

describe('Spirale Climatique', () => {
  beforeEach(() => {
    // Clear localStorage to start with a clean state
    cy.clearLocalStorage();
    // Intercept API requests
    cy.intercept('GET', '/api/shelly/live*').as('getLive');
    cy.intercept('GET', '/api/shelly?*').as('getHistory');
    
    cy.visit('/');
    cy.wait('@getLive');
    cy.wait('@getHistory');
    
    // Switch to CLIMAT tab in the sidebar
    cy.contains('CLIMAT').click();
  });

  it('affiche la spirale climatique avec le bon design', () => {
    cy.contains('SPIRALE CLIMATIQUE').should('be.visible');
    
    // Verify Layout Grid
    cy.get('.climate-grid')
      .should('have.css', 'display', 'grid');

    // Verify SVG Spiral structure and existence
    cy.get('[data-testid="climate-spiral-svg"]')
      .should('be.visible')
      .and('have.css', 'width')
      .and('not.equal', '0px');

    // Verify Panel backgrounds
    cy.get('.panel').first()
      .should('have.css', 'border-radius', '16px')
      .and('have.css', 'background-color')
      .and('include', 'rgba(16, 18, 35, 0.45)'); // var(--panel-bg)
      
    // Verify month labels are Space Grotesk
    cy.get('[data-testid="month-label-0"]')
      .should('have.css', 'font-family')
      .and('match', /Space Grotesk/);
  });
});
