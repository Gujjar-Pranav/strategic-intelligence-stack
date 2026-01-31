import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },

  // ✅ Allow "any" ONLY in these JSON-heavy / export-only files
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

  // ✅ Print/export pages often use window/sessionStorage etc.
  {
    files: ["src/app/export/**/*.{ts,tsx}"],
    rules: {
      "@next/next/no-document-import-in-page": "off",
    },
  },
];
