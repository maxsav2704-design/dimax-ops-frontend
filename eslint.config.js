import js from "@eslint/js";
import globals from "globals";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// Options of a recommended jsx-a11y rule (ignored elements/roles), so a local
// override adds to them instead of replacing them.
function a11yRuleOptions(rule) {
  const level = jsxA11y.flatConfigs.recommended.rules[rule];
  return Array.isArray(level) && level[1] ? level[1] : {};
}

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      // NEXT_DIST_DIR builds (.next-dev, .next-acceptance, ...) are output, not source.
      ".next-*/**",
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Accessibility: the recommended set as errors (block 3 of the admin
      // audit brought the count to zero on 2026-10-16).
      ...jsxA11y.flatConfigs.recommended.rules,
      // Deprecated in jsx-a11y and superseded by label-has-associated-control,
      // which accepts a nested control; keeping both would flag every
      // <label>text<Input/></label> pair twice.
      "jsx-a11y/label-has-for": "off",
      // Our labels and buttons nest their text two or three wrappers deep
      // (icon + title + meta); the text is there, so look that deep.
      "jsx-a11y/label-has-associated-control": ["error", { ...a11yRuleOptions("jsx-a11y/label-has-associated-control"), depth: 3 }],
      "jsx-a11y/control-has-associated-label": ["error", { ...a11yRuleOptions("jsx-a11y/control-has-associated-label"), depth: 3 }],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: [
      "app/**/*.{ts,tsx}",
      "src/components/journal/**/*.{ts,tsx}",
      "src/components/ui/**/*.{ts,tsx}",
      "src/lib/i18n.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
