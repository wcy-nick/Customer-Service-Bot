import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";
import configPrettier from "eslint-config-prettier";

export default [
  {
    ignores: ["dist/", "node_modules/", "coverage/", "artifacts/", "uploads/"],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
      prettier: prettier,
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      "prettier/prettier": "error",
      "no-console": "warn",
      "no-debugger": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  configPrettier,
];
