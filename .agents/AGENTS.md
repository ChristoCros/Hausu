# Privacy & Security Rules

- **DO NOT commit personal data to GitHub**: Before making any git commits or pushing to remote repositories, ALWAYS ensure that the user's personal information (such as exact geographic coordinates, latitude, longitude, city name, home address, API keys, or IP addresses) is NOT hardcoded in the codebase.
- Use environment variables (`.env`) for any sensitive or personal information.
- Ensure that files containing personal configuration (like `.env`, `netatmo.json`, etc.) are tracked in `.gitignore` and NEVER committed.
- When generating placeholder data or fallback values, use generic locations (e.g., Paris) instead of the user's actual location.

# Pre-Commit & Pre-Push Rules

- **Always run tests and linters**: Before making any git commits or pushing to remote repositories, you MUST successfully run the linter (`npm run lint`) and the Cypress E2E tests (`npm run cypress:run`). Never push failing code.
