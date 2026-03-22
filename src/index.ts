/**
 * mantine-rjsf-builder
 *
 * A Mantine-native visual form builder that outputs JSON Schema + RJSF UI Schema.
 *
 * **Three ways to use this library:**
 *
 * 1. **Pure functions** — `buildSchema` and `parseSchema` convert between
 *    `FieldDefinition[]` and JSON Schema + UI Schema. No React required.
 *
 * 2. **React component** — `<SchemaBuilder>` provides a full visual editor
 *    built with Mantine components. Requires `@mantine/core` and `lucide-react`.
 *
 * 3. **Round-trip** — Parse an existing schema into fields, edit visually,
 *    then build back to schema. Pass the same config for fidelity.
 *
 * @example
 * ```ts
 * // Pure function usage (no React)
 * import { buildSchema, parseSchema } from "mantine-rjsf-builder";
 * import type { SchemaBuilderConfig } from "mantine-rjsf-builder";
 *
 * const config: SchemaBuilderConfig = {
 *   fieldNameFormat: "snake_case",
 *   widgetMapping: { datetime: "DateTimeWidget" },
 * };
 *
 * const { jsonSchema, uiSchema } = buildSchema(fields, config);
 * const fields = parseSchema(jsonSchema, uiSchema, config);
 * ```
 *
 * @example
 * ```tsx
 * // Visual builder component
 * import { SchemaBuilder } from "mantine-rjsf-builder";
 *
 * <SchemaBuilder config={config} onChange={({ jsonSchema, uiSchema }) => {
 *   // Save schemas
 * }} />
 * ```
 *
 * @packageDocumentation
 */

export { buildSchema } from "./buildSchema";
export { parseSchema } from "./parseSchema";
export { SchemaBuilder } from "./components/SchemaBuilder";
export type {
	FieldCondition,
	FieldDefinition,
	FieldType,
	SchemaBuilderConfig,
	SchemaOutput,
	SelectOption,
} from "./types";
