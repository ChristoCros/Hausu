# Smart Dashboard — Commandes Dev

## Lancer le projet en local

**Le plus simple :**
Double-cliquez simplement sur le fichier **`start.bat`** à la racine du projet depuis l'explorateur Windows.
Cela lance le serveur sans être bloqué par les sécurités de PowerShell.

> L'adresse exacte à ouvrir dans le navigateur est : **http://127.0.0.1:3000**
> (Cela évite les bugs de résolution de `localhost` sous Windows)

*(Si vous préférez la ligne de commande manuelle, utilisez `cmd /c npm run dev`)*

**Répertoire de travail :**
```
c:\Users\Christopher\.gemini\antigravity\scratch\smart-dashboard
```

> Lance **Next.js (Turbo)** sur `127.0.0.1:3000` + le **worker backend** (`tsx src/backend/worker.ts`) en parallèle via `concurrently`.

## Autres commandes

| Commande | Description |
|---|---|
| `cmd /c npm run build` | Build de production |
| `cmd /c npm run start` | Démarrer le build de production |
| `cmd /c npm run lint` | Linter ESLint |
| `cmd /c npm run cypress:open` | Ouvrir Cypress (tests E2E) |
| `cmd /c npm run cypress:run` | Lancer les tests Cypress en headless |
