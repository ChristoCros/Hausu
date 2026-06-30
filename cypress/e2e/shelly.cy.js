// cypress/e2e/shelly.cy.js

describe('Hausu Smart Dashboard', () => {
  describe('API Shelly', () => {
    it('GET /api/shelly/live retourne les donnees live ou une erreur 503', () => {
      cy.request({ url: '/api/shelly/live', failOnStatusCode: false }).then((response) => {
        expect([200, 503]).to.include(response.status);
        if (response.status === 200) {
          expect(response.body).to.include.keys('voltage_a', 'current_a', 'power_a');
        } else {
          expect(response.body).to.include.keys('error');
        }
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
      cy.contains(/^Maison$/).should('be.visible');
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
      // The labels are MAISON, SOLAIRE, CHAUFFE-EAU in classic theme
      cy.contains('MAISON').should('be.visible');
      cy.contains('SOLAIRE').should('be.visible');
      cy.contains('CHAUFFE-EAU').should('be.visible');
      cy.contains('Tension').should('be.visible');
      cy.contains('Courant').should('be.visible');
    });

    it('affiche le bloc meteo', () => {
      cy.contains('MÉTÉO').should('be.visible');
    });

    it('permet de changer le theme de classic a nier dans les parametres', () => {
      cy.get('#settings-btn').click();
      cy.contains('PARAMETRES SYSTEME').should('be.visible');
      cy.contains('Design Visuel / Thème').should('be.visible');
      
      // Click theme NieR
      cy.get('#theme-nier-btn').click();
      cy.get('#save-settings-btn').click();
      cy.contains('PARAMETRES SYSTEME').should('not.exist');
      cy.window().its('localStorage.theme').should('eq', 'nier');

      // Check if layout has theme-nier class
      cy.get('.main-layout').should('have.class', 'theme-nier');
    });

    it('verifie les proprietes CSS principales du design', () => {
      cy.visit('/');
      cy.wait('@getLive');
      cy.wait('@getHistory');

      // Check global font
      cy.get('body').should('have.css', 'font-family').and('match', /Inter/);
      
      // Check titles font
      cy.get('.title-font').first().should('have.css', 'font-family').and('match', /Space Grotesk/);
      
      // Check panel styles
      cy.get('.panel').first()
        .should('have.css', 'border-radius', '16px')
        .and('have.css', 'border')
        .and('include', 'rgba(255, 255, 255, 0.05)'); // var(--border-color)

      // Check power flow container background and structure
      cy.get('.power-flow-container')
        .should('have.css', 'display', 'flex')
        .and('have.css', 'overflow', 'hidden');

      // Check appliance items
      cy.get('.appliance-item').first()
        .should('have.css', 'border-radius', '8px')
        .and('have.css', 'display', 'flex');
    });

    it('traite la production solaire <= 5W comme inactive (0 W)', () => {
      // Intercept live data with solar at -4 W (absolute value 4 W, which is <= 5 W)
      cy.intercept('GET', '/api/shelly/live*', {
        statusCode: 200,
        body: {
          voltage_a: 230,
          current_a: 4.3,
          power_a: 1000, // grid import 1000 W
          voltage_b: 230,
          current_b: 0.02,
          power_b: -4, // solar prod 4 W
          voltage_c: 230,
          current_c: 0,
          power_c: 0,
        },
      }).as('getLiveLowSolar');

      cy.visit('/');
      cy.wait('@getLiveLowSolar');

      // Solaire flow node should show 0 W
      cy.get('[title="solar-node"]').contains('0 W');

      // Maison flow node should show 1000 W (not 1004 W)
      cy.get('[title="maison-node"]').contains('1000 W');

      // Sidebar should display SOLAR IDLE status
      cy.contains('SOLAR IDLE').should('be.visible');
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
