describe('Layout Regressions', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.intercept('GET', '/api/shelly/live*').as('getLive');
    cy.intercept('GET', '/api/shelly?*').as('getHistory');
  });

  it('Dashboard mobile layout should not constrain details-weather-container height', () => {
    cy.viewport('iphone-xr');
    cy.visit('/');
    cy.wait('@getLive');
    cy.wait('@getHistory');

    // The details-weather-container should not have height: 100%
    cy.get('.details-weather-container')
      .should('have.css', 'height')
      .and('not.eq', '100%');

    // The weather panel should expand to its content and not collapse
    // Checking that flex collapse bug doesn't regress
    cy.get('.weather-panel')
      .should('have.css', 'flex', '0 0 auto') // "flex: none" is equivalent to "0 0 auto" in Cypress computed styles
      .and('not.have.css', 'min-height', '0px');
  });

  it('WeatherForecast grid should not blow out screen width on mobile', () => {
    cy.viewport('iphone-xr');
    cy.visit('/');
    cy.wait('@getLive');
    cy.wait('@getHistory');

    // On mobile, the text might be hidden, so click by index (4th tab is Weather)
    cy.get('.sidebar-link').eq(3).click();
    cy.contains('Prévisions Météo Agricole', { timeout: 10000 }).should('be.visible');

    // The grid items containing the wide table should have min-width: 0px to prevent blowout
    cy.get('.weather-grid > .panel')
      .first()
      .should('have.css', 'min-width', '0px');

    cy.get('.weather-sidebar')
      .should('have.css', 'min-width', '0px');

    // The table container should have overflow-x auto
    cy.get('.weather-table-container')
      .should('have.css', 'overflow-x', 'auto');
  });

  it('Content Area should not have padding-right on mobile to align with menu', () => {
    cy.viewport('iphone-xr');
    cy.visit('/');
    
    cy.get('.content-area')
      .should('have.css', 'padding-right', '0px');
  });

  it('Content Area should retain padding-right on desktop', () => {
    cy.viewport(1920, 1080);
    cy.visit('/');
    
    cy.get('.content-area')
      .should('have.css', 'padding-right', '5px');
  });
});
