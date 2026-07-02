// cypress/e2e/todo.cy.js

describe('Planificateur & Actions', () => {
  beforeEach(() => {
    // Clear localStorage to start with a clean state
    cy.clearLocalStorage();
    // Intercept live API requests to wait for hydration
    cy.intercept('GET', '/api/shelly/live*').as('getLive');
    cy.intercept('GET', '/api/shelly?*').as('getHistory');
    cy.visit('/');
    cy.wait('@getLive');
    cy.wait('@getHistory');
    // Switch to PLANIFICATEUR tab in the sidebar
    cy.contains('PLANIFICATEUR').click();
  });

  it('affiche le planificateur avec les colonnes par defaut', () => {
    cy.contains('PLANIFICATEUR & ACTIONS').should('be.visible');
    cy.get('.todo-column-title-input').first().should('have.value', 'Maison');
    cy.get('.todo-column-title-input').eq(1).should('have.value', 'Travail');
    cy.contains('Vérifier la production solaire').should('be.visible');

    // Design Assertions for Layout and Styles
    // Check main planner layout
    cy.get('.todo-board')
      .should('have.css', 'display', 'flex')
      .and('have.css', 'gap', '15px');

    // Check column layout
    cy.get('.todo-column-panel').first()
      .should('have.css', 'border-radius', '16px');

    // Check action card layout
    cy.get('.todo-item-card').first()
      .should('have.css', 'border-radius', '8px')
      .and('have.css', 'display', 'flex')
      .and('have.css', 'border')
      .and('include', 'rgba(255, 255, 255, 0.05)'); // var(--border-color)
  });

  it('permet d\'ajouter une nouvelle liste (colonne)', () => {
    cy.get('.todo-column-input').type('Urgents');
    cy.get('.todo-add-col-btn').click();
    cy.get('.todo-column-title-input').last().should('have.value', 'Urgents');
  });

  it('permet de renommer une colonne', () => {
    cy.get('.todo-column-title-input').first().clear().type('Perso{enter}');
    cy.get('.todo-column-title-input').first().should('have.value', 'Perso');
  });

  it('permet d\'ajouter une action dans une colonne', () => {
    cy.get('.todo-item-input').first().type('Arroser les plantes{enter}');
    cy.contains('Arroser les plantes').should('be.visible');
  });

  it('permet de modifier le texte d\'une action en ligne (contentEditable)', () => {
    cy.contains('Nettoyer le capteur de température extérieur')
      .click()
      .type('{selectall}{backspace}Nettoyer le capteur ext')
      .blur();
    
    cy.contains('Nettoyer le capteur ext').should('be.visible');
    
    // Refresh page
    cy.reload();
    // Wait for hydration after reload
    cy.wait('@getLive');
    cy.wait('@getHistory');
    cy.contains('PLANIFICATEUR').click();
    
    cy.contains('Nettoyer le capteur ext').should('be.visible');
  });

  it('permet de cocher/valider une action', () => {
    cy.get('.todo-item-card').eq(1).within(() => {
      cy.get('.todo-checkbox-custom').click();
    });
    cy.get('.todo-item-card').eq(1).should('have.class', 'completed');
  });

  it('permet de supprimer une action', () => {
    cy.get('.todo-item-card').first().within(() => {
      cy.get('.todo-item-delete-btn').click({ force: true });
    });
    cy.contains('Vérifier la production solaire').should('not.exist');
  });

  it('permet de supprimer une colonne avec la double confirmation', () => {
    // 1st click -> confirm mode
    cy.get('.todo-delete-column-btn').first().click();
    cy.get('.todo-delete-column-btn').first().should('have.class', 'confirm-delete');
    
    // 2nd click -> delete
    cy.get('.todo-delete-column-btn').first().click();
    
    cy.contains('Maison').should('not.exist');
  });
});
