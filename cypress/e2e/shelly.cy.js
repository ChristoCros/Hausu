// cypress/e2e/shelly.cy.js

describe('Hausu Smart Dashboard', () => {
  describe('API Shelly', () => {
    it('GET /api/shelly/live retourne les donnees live avec la bonne structure', () => {
      cy.request('/api/shelly/live').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.include.keys(
          'voltage_a',
          'current_a',
          'power_a',
          'voltage_b',
          'current_b',
          'power_b',
          'voltage_c',
          'current_c',
          'power_c',
        );
      });
    });

    it('GET /api/shelly retourne un historique structure avec 60 creneaux', () => {
      cy.request('/api/shelly').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('history');
        expect(response.body).to.have.property('targetHour');
        expect(response.body.history).to.be.an('array');
        expect(response.body.history).to.have.length(60);
        expect(response.body.history[0]).to.include.keys('time', 'Maison', 'Solaire', 'ChauffeEau');
      });
    });

    it('/api/settings est supprime', () => {
      cy.request({ url: '/api/settings', failOnStatusCode: false }).then((response) => {
        expect(response.status).to.eq(404);
      });
    });
  });

  describe('Interface dashboard', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/shelly/live*').as('getLive');
      cy.intercept('GET', '/api/shelly?*').as('getHistory');
      cy.visit('/');
      cy.wait('@getLive');
      cy.wait('@getHistory');
    });

    it('affiche la sidebar et la navigation actuelle', () => {
      cy.contains('HAUSU').should('be.visible');
      cy.contains('DASHBOARD ÉNERGIE').should('be.visible');
      cy.contains('CLIMAT').should('be.visible');
    });

    it('affiche le flux energie', () => {
      cy.contains('POWER FLOW').should('be.visible');
      cy.contains('Maison (Phase A)').should('be.visible');
      cy.contains('Solaire (Phase B)').should('be.visible');
      cy.contains('Chauffe-eau (Phase C)').should('be.visible');
      cy.get('[title="grid-node"]').should('exist');
    });

    it('affiche le graphique historique et ses controles', () => {
      cy.contains('HISTORIQUE').should('be.visible');
      cy.contains(':00').should('be.visible');
      cy.get('button').find('svg.lucide-chevron-left').should('exist');
      cy.get('button').find('svg.lucide-chevron-right').should('exist');
    });

    it('affiche les details de puissance', () => {
      cy.contains('DETAILS - MAISON').should('be.visible');
      cy.contains('DETAILS - SOLAIRE').should('be.visible');
      cy.contains('DETAILS - CHAUFFE-EAU').should('be.visible');
      cy.contains('Tension').should('be.visible');
      cy.contains('Courant').should('be.visible');
    });

    it('affiche le bloc meteo', () => {
      cy.contains('MÉTÉO').should('be.visible');
    });

    it('enregistre l IP Shelly dans le navigateur sans /api/settings', () => {
      cy.get('#settings-btn').click();
      cy.contains('PARAMETRES SYSTEME').should('be.visible');
      cy.contains('Connectivite Shelly').should('be.visible');
      cy.get('#shelly-ip-input').clear().type('192.168.1.68');
      cy.get('#save-settings-btn').click();
      cy.contains('PARAMETRES SYSTEME').should('not.exist');
      cy.window().its('localStorage.shellyIp').should('eq', '192.168.1.68');

      cy.get('#settings-btn').click();
      cy.get('#close-settings-btn').click();
      cy.contains('PARAMETRES SYSTEME').should('not.exist');
    });
  });

  describe('Indicateur solaire dynamique', () => {
    it('affiche un soleil quand le solaire produit de l energie', () => {
      cy.intercept('GET', '/api/shelly/live*', {
        statusCode: 200,
        body: {
          voltage_a: 230,
          current_a: 1.5,
          power_a: 345,
          voltage_b: 230,
          current_b: 4.3,
          power_b: -1000,
          voltage_c: 230,
          current_c: 0,
          power_c: 0,
        },
      }).as('getLiveProducing');

      cy.visit('/');
      cy.wait('@getLiveProducing');

      cy.get('[title="Production solaire active"]').should('exist');
      cy.get('[title="Production solaire active"]').find('svg.lucide-sun').should('exist');
      cy.get('[title="Production solaire active"]').find('svg.lucide-moon').should('not.exist');
    });

    it('affiche un soleil grise quand le solaire ne produit pas d energie', () => {
      cy.intercept('GET', '/api/shelly/live*', {
        statusCode: 200,
        body: {
          voltage_a: 230,
          current_a: 1.5,
          power_a: 345,
          voltage_b: 230,
          current_b: 0,
          power_b: 0,
          voltage_c: 230,
          current_c: 0,
          power_c: 0,
        },
      }).as('getLiveNotProducing');

      cy.visit('/');
      cy.wait('@getLiveNotProducing');

      cy.get('[title="Pas de production solaire"]').should('exist');
      cy.get('[title="Pas de production solaire"]').find('svg.lucide-sun').should('exist');
      cy.get('[title="Pas de production solaire"]').find('svg.lucide-moon').should('not.exist');
    });
  });

  describe('Conseils d\'appareils', () => {
    it('affiche la liste des appareils conseilles', () => {
      cy.visit('/');
      cy.contains('APPAREILS CONSEILLÉS').should('be.visible');
    });

    it('calcule et affiche correctement les statuts des appareils en fonction du surplus solaire', () => {
      cy.intercept('GET', '/api/shelly/live*', {
        statusCode: 200,
        body: {
          voltage_a: 230,
          current_a: -8.7, // -2000 W surplus
          power_a: -2000, 
          voltage_b: 230,
          current_b: 13,
          power_b: -3000, // 3000 W production solaire
          voltage_c: 230,
          current_c: 0,
          power_c: 0,
        },
      }).as('getLiveSurplus');

      cy.visit('/');
      cy.wait('@getLiveSurplus');

      // Vérifier que la liste s'adapte
      // Aspirateur (15.2W) <= 2000W surplus -> Lançable
      cy.contains('Aspirateur chargeur').parents('.appliance-item').within(() => {
        cy.contains('Lançable').should('exist');
      });

      // Machine Krups (1450W) <= 2000W surplus -> Lançable
      cy.contains('Machine Krups').parents('.appliance-item').within(() => {
        cy.contains('Lançable').should('exist');
      });

      // Four (2725W) > 2000W surplus mais <= 3000W solaire -> Partiel
      cy.contains(/^Four$/).parents('.appliance-item').within(() => {
        cy.contains('Partiel').should('exist');
      });

      // Vérifier que les icônes lancables s'affichent dans la barre d'icônes avec data-tooltip
      cy.get('.appliances-panel').within(() => {
        cy.get('.tooltip-trigger[data-tooltip="Aspirateur chargeur (15.2 W)"]').should('exist');
        cy.get('.tooltip-trigger[data-tooltip="Machine Krups (1450 W)"]').should('exist');
      });
    });
  });
});
