import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "src-tauri/**",
      "node_modules/**",
      "scripts/**",
      "*.config.js",
      "*.config.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        Image: "readonly",
        fetch: "readonly",
        btoa: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        MediaDeviceInfo: "readonly",
        HTMLElement: "readonly",
        HTMLCanvasElement: "readonly",
        HTMLVideoElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLImageElement: "readonly",
        SVGElement: "readonly",
        XMLSerializer: "readonly",
        NodeJS: "readonly",
        React: "readonly",
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // A warning, not an error: the codebase carries ~50 of these and clearing them
      // is its own piece of work.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "no-case-declarations": "error",
      // Ambient global types in src/types.d.ts are legitimately undeclared here.
      "no-undef": "off",
    },
  },
  {
    // Vitest globals. Covers .tsx too, or component tests lint as undefined globals.
    files: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        vi: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        global: "readonly",
      },
    },
  }
);
