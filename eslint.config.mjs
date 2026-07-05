import { defineConfig, globalIgnores } from "eslint/config";
import { fixupConfigRules } from "@eslint/compat";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  globalIgnores(["**/webpack.config.ts", "eslint.config.mjs", "**/.gitignore"]),
  {
    extends: fixupConfigRules(
      compat.extends(
        "eslint:recommended",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
        "plugin:@typescript-eslint/recommended",
        //   This requires generating parsers:
        //   - plugin:@typescript-eslint/recommended-requiring-type-checking
      ),
    ),

    linterOptions: {
      reportUnusedDisableDirectives: true,
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 12,
      sourceType: "module",

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },

        project: "./tsconfig.json",
      },
    },

    settings: {
      react: {
        version: "detect",
      },
    },

    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-extraneous-class": "warn",
      "@typescript-eslint/no-useless-constructor": "warn",
      // '@typescript-eslint/explicit-member-accessibility': warn
      // '@typescript-eslint/prefer-readonly': warn
      // This rule requires generating parsers:
      // '@typescript-eslint/no-unnecessary-condition':
      //   - warn
      //   - allowConstantLoopConditions: true
      "array-bracket-spacing": ["warn", "never"],
      "arrow-body-style": ["warn", "as-needed"],
      "arrow-parens": ["warn", "as-needed"],
      "arrow-spacing": "warn",
      "block-spacing": "warn",

      "brace-style": [
        "warn",
        "stroustrup",
        {
          allowSingleLine: true,
        },
      ],

      "comma-spacing": "warn",
      "computed-property-spacing": "warn",
      curly: "warn",
      "dot-notation": "warn",
      "eol-last": "warn",
      eqeqeq: "warn",
      "func-call-spacing": "warn",
      "generator-star-spacing": "warn",

      indent: [
        "warn",
        4,
        {
          SwitchCase: 1,
        },
      ],

      "key-spacing": "warn",
      "keyword-spacing": "warn",
      "max-len": ["warn", 120],
      "no-array-constructor": "warn",
      "no-duplicate-imports": "warn",
      "no-irregular-whitespace": "warn",
      "no-lonely-if": "warn",
      "no-multi-spaces": "warn",

      "no-multiple-empty-lines": [
        "warn",
        {
          max: 1,
        },
      ],

      "no-new-wrappers": "warn",
      "no-trailing-spaces": "warn",
      "no-unneeded-ternary": "warn",
      "no-unused-expressions": "warn",
      "no-useless-return": "warn",
      "no-var": "warn",
      "no-whitespace-before-property": "warn",
      "object-shorthand": "warn",
      "object-curly-spacing": ["warn", "always"],
      "padded-blocks": ["warn", "never"],
      "prefer-arrow-callback": "warn",
      "prefer-const": "warn",

      "prefer-destructuring": [
        "warn",
        {
          object: true,
          array: true,
        },
      ],

      quotes: [
        "warn",
        "single",
        {
          avoidEscape: true,
        },
      ],

      "react/jsx-indent": "warn",
      "react/no-typos": "warn",
      // Disable react/prop-types, because it complains about types that could be inferred when using React.FC<Props>.
      "react/prop-types": "off",
      "rest-spread-spacing": "warn",
      semi: "warn",
      "semi-spacing": "warn",
      "space-before-blocks": "warn",
      "space-before-function-paren": ["warn", "never"],
      "space-in-parens": "warn",
      "space-infix-ops": "warn",
      "space-unary-ops": "warn",
      "spaced-comment": "warn",
      "switch-colon-spacing": "warn",
      "template-curly-spacing": "warn",
      "template-tag-spacing": "warn",
      "unicode-bom": "warn",
      "yield-star-spacing": "warn",
      yoda: "warn",
    },
  },
]);
