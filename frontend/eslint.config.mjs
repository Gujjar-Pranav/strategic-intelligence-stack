import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  // Base JS + TS recommendations
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Next.js rules
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },

  // React Hooks
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Can keep this as "warn" if you want less noise
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // Allow `any` in data-heavy / export / backend-style files
  {
    files: [
      "src/app/api/**/*.{ts,tsx}",
      "src/app/export/**/*.{ts,tsx}",
      "src/lib/api.ts",
      "src/components/dashboard/segmentation/**/*.ts",
      "src/components/dashboard/segmentation/**/*.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": [
        "warn",
        { "ts-ignore": "allow-with-description" },
      ],
    },
  },

  // Print / export pages (window, sessionStorage, etc.)
  {
    files: ["src/app/export/**/*.{ts,tsx}"],
    rules: {
      "@next/next/no-document-import-in-page": "off",
    },
  },
];
