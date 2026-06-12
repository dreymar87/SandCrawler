module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  ignorePatterns: ["dist", "node_modules", "*.cjs"],
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  plugins: ["@typescript-eslint", "react-hooks", "react-refresh"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "react-refresh/only-export-components": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
  },
};
