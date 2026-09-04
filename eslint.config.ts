import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], 
    languageOptions: { globals: globals.node },
    rules: {
      "no-unused-vars": "warn",
      "semi": ["error", "always"]
    }
  },
]);
