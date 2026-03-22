import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  splitting: true,
  clean: true,
  external: [
    "react",
    "react-dom",
    "@mantine/core",
    "@mantine/hooks",
    "@rjsf/core",
    "@rjsf/mantine",
    "@rjsf/utils",
    "@rjsf/validator-ajv8",
  ],
});
