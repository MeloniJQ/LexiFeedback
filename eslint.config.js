import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
  recommendedConfig: "eslint:recommended",
});

export default [
  ...compat.extends(
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended"
  ),
];
