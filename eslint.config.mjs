import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";

const eslintConfig = defineConfig([
  sonarjs.configs.recommended,
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "sonarjs/cognitive-complexity": "warn",
      "sonarjs/no-nested-conditional": "warn",
      "sonarjs/pseudo-random": "warn",
      "sonarjs/todo-tag": "warn",
      "sonarjs/no-nested-functions": "warn",
      "sonarjs/no-dead-store": "warn",
      "sonarjs/no-all-duplicated-branches": "warn",
      "sonarjs/no-forced-browser-interaction": "warn"
    }
  }
]);

export default eslintConfig;
