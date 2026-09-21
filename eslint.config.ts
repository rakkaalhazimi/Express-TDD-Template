import globals from "globals";
import { defineConfig } from "eslint/config";
import stylistic from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: ["dist/**", "node_modules/**", "database.db", "coverage/**", "src/db/migrations/**"],
  },
  ...tseslint.configs.recommended,
  {
    plugins: { "@stylistic": stylistic },
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: { globals: globals.node },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@stylistic/semi": ["error", "always"],
      "@stylistic/comma-dangle": ["error", "always-multiline"],
      "@stylistic/indent": ["error", 2, { SwitchCase: 1 }],
      "@stylistic/no-trailing-spaces": "error",
    },
  },
]);