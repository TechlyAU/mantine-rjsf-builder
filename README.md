# mantine-rjsf-builder

A Mantine-native visual form builder that outputs [JSON Schema](https://json-schema.org/) + [RJSF](https://rjsf-team.github.io/react-jsonschema-form/) UI Schema.

Design forms visually with Mantine components, get standards-compliant JSON Schema and RJSF UI Schema as output. Fully config-driven — adapt the output to match your project's conventions without forking.

## Features

- **Config-driven schema generation** — control field name format, select representation, widget mapping, custom extensions, and more via a single config object
- **Round-trip fidelity** — `buildSchema` and `parseSchema` are inverses; load existing schemas for editing, then save back
- **Mantine-native UI** — the `<SchemaBuilder>` component uses Mantine's Accordion, TextInput, Select, Switch, and Button — no style conflicts
- **RJSF-compatible output** — generated UI Schema works with `@rjsf/core`, `@rjsf/mantine`, or any RJSF theme
- **Conditional fields** — `if`/`then` support for fields that appear based on another field's value
- **Headless-friendly** — `buildSchema` and `parseSchema` are pure functions with zero React dependencies; use them in scripts, servers, or tests
- **Tree-shakeable** — ESM-only, so bundlers drop what you don't import

## Install

```bash
bun add mantine-rjsf-builder
# or
npm install mantine-rjsf-builder
```

### Peer dependencies

| Package | Version |
|---------|---------|
| `react` | >= 18 |
| `react-dom` | >= 18 |
| `@mantine/core` | >= 7 |
| `@mantine/hooks` | >= 7 |
| `@rjsf/core` | >= 6 |
| `@rjsf/mantine` | >= 6 |
| `@rjsf/utils` | >= 6 |
| `@rjsf/validator-ajv8` | >= 6 |

> The pure functions (`buildSchema`, `parseSchema`, types) work without any peer dependencies.
> Only the `<SchemaBuilder>` component requires React and Mantine.

## Quick start

### Pure functions (no React)

```ts
import { buildSchema, parseSchema } from "mantine-rjsf-builder";
import type { FieldDefinition, SchemaBuilderConfig } from "mantine-rjsf-builder";

const config: SchemaBuilderConfig = {
  fieldNameFormat: "snake_case",
  selectFormat: "oneOf",
  widgetMapping: {
    datetime: "DateTimeWidget",
    date: "DateWidget",
  },
};

const fields: FieldDefinition[] = [
  { id: "1", name: "Full Name", title: "Full Name", type: "string", required: true },
  { id: "2", name: "Date of Birth", title: "Date of Birth", type: "date", required: false },
  {
    id: "3", name: "Status", title: "Status", type: "select", required: true,
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
];

const { jsonSchema, uiSchema } = buildSchema(fields, config);
// jsonSchema.properties → { full_name: ..., date_of_birth: ..., status: ... }

// Round-trip: parse back to FieldDefinition[]
const parsed = parseSchema(jsonSchema, uiSchema, config);
```

### Visual builder component

```tsx
import { SchemaBuilder } from "mantine-rjsf-builder";
import type { SchemaBuilderConfig, SchemaOutput } from "mantine-rjsf-builder";

const config: SchemaBuilderConfig = {
  fieldNameFormat: "snake_case",
  selectFormat: "oneOf",
};

function FormDesigner() {
  const handleChange = ({ jsonSchema, uiSchema }: SchemaOutput) => {
    console.log(JSON.stringify(jsonSchema, null, 2));
    console.log(JSON.stringify(uiSchema, null, 2));
  };

  return <SchemaBuilder config={config} onChange={handleChange} />;
}
```

### Loading an existing schema for editing

```tsx
const existingSchema: SchemaOutput = {
  jsonSchema: { /* ... */ },
  uiSchema: { /* ... */ },
};

<SchemaBuilder
  config={config}
  initialSchema={existingSchema}
  onChange={handleChange}
/>
```

## API reference

### `buildSchema(fields, config?)`

Convert a `FieldDefinition[]` into a JSON Schema + UI Schema pair.

| Parameter | Type | Description |
|-----------|------|-------------|
| `fields` | `FieldDefinition[]` | The fields to include |
| `config` | `SchemaBuilderConfig` | Optional config (see below) |
| **Returns** | `SchemaOutput` | `{ jsonSchema, uiSchema }` |

Pure function, no side effects. The output is fully determined by the inputs.

### `parseSchema(jsonSchema, uiSchema?, config?)`

Parse a JSON Schema + UI Schema back into `FieldDefinition[]`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `jsonSchema` | `Record<string, unknown>` | The JSON Schema to parse |
| `uiSchema` | `Record<string, unknown>` | Optional UI Schema for better type inference |
| `config` | `SchemaBuilderConfig` | Optional config for widget reverse-mapping |
| **Returns** | `FieldDefinition[]` | Parsed field definitions |

### `<SchemaBuilder>`

Visual form builder React component.

| Prop | Type | Description |
|------|------|-------------|
| `config` | `SchemaBuilderConfig` | Schema generation config |
| `initialSchema` | `SchemaOutput` | Existing schema to load for editing |
| `onChange` | `(schema: SchemaOutput) => void` | Called on every field change |

## Configuration

`SchemaBuilderConfig` controls all schema generation behaviour. Every option has a sensible default — pass only what you need to override.

```ts
interface SchemaBuilderConfig {
  // JSON Schema root metadata
  schemaVersion?: string;         // default: "https://json-schema.org/draft/2020-12/schema"
  schemaIdPrefix?: string;        // if set, adds $id: `${prefix}form.json`

  // Field naming
  fieldNameFormat?: "snake_case" | "camelCase" | "as-is";  // default: "as-is"

  // Select/multiselect format
  selectFormat?: "oneOf" | "enum";  // default: "oneOf"

  // RJSF widget mapping (field type → widget name)
  widgetMapping?: Partial<Record<FieldType, string | null>>;

  // Default UI Schema properties per field type
  uiSchemaDefaults?: Partial<Record<FieldType, Record<string, unknown>>>;

  // Types excluded from the `required` array
  neverRequired?: FieldType[];    // default: ["boolean"]

  // Custom JSON Schema extensions per field
  extensions?: Record<string, (field: FieldDefinition) => Record<string, unknown> | null>;

  // Whether to generate ui:order
  generateOrder?: boolean;        // default: true
}
```

### Example: full config

```ts
const config: SchemaBuilderConfig = {
  schemaVersion: "https://json-schema.org/draft/2020-12/schema",
  schemaIdPrefix: "https://example.com/schemas/",
  fieldNameFormat: "snake_case",
  selectFormat: "oneOf",
  widgetMapping: {
    datetime: "DateTimeWidget",
    date: "DateWidget",
    time: "TimeWidget",
    integer: "UpDownWidget",
    number: "UpDownWidget",
    multiselect: "MultiSelectWidget",
  },
  uiSchemaDefaults: {
    datetime: {
      "ui:emptyValue": "",
      "ui:options": {
        valueFormat: "YYYY-MM-DDTHH:mm:ss[Z]",
        displayFormat: "DD MMM YYYY HH:mm",
      },
    },
    date: {
      "ui:emptyValue": "",
      "ui:options": { valueFormat: "YYYY-MM-DD", displayFormat: "DD MMM YYYY" },
    },
    string: { "ui:emptyValue": "" },
    select: { "ui:emptyValue": "" },
  },
  neverRequired: ["boolean"],
  extensions: {
    "x-default-now": (field) =>
      field.defaultNow ? { "x-default-now": true } : null,
  },
  generateOrder: true,
};
```

## Field types

| FieldType | JSON Schema output | Notes |
|-----------|-------------------|-------|
| `string` | `{ type: "string" }` | `longText` adds `maxLength: 10000` + textarea widget |
| `integer` | `{ type: "integer" }` | |
| `number` | `{ type: "number" }` | |
| `boolean` | `{ type: "boolean" }` | Never added to `required` by default |
| `date` | `{ type: "string", format: "date" }` | |
| `datetime` | `{ type: "string", format: "date-time" }` | |
| `time` | `{ type: "string", format: "time" }` | |
| `select` | `{ oneOf: [...] }` or `{ enum: [...] }` | Controlled by `selectFormat` config |
| `multiselect` | `{ type: "array", uniqueItems: true, items: ... }` | |

## Conditional fields

Fields can have conditions that show child fields when a parent value matches:

```ts
const fields: FieldDefinition[] = [
  {
    id: "1",
    name: "type",
    title: "Incident Type",
    type: "select",
    required: true,
    options: [
      { value: "fire", label: "Fire" },
      { value: "flood", label: "Flood" },
    ],
    conditions: [
      {
        whenValue: "fire",
        fields: [
          { id: "2", name: "extinguisher_used", title: "Extinguisher Used?", type: "boolean", required: false },
        ],
      },
      {
        whenValue: "flood",
        fields: [
          { id: "3", name: "water_level", title: "Water Level (cm)", type: "integer", required: true },
        ],
      },
    ],
  },
];
```

This generates JSON Schema `allOf` with `if`/`then` clauses:

```json
{
  "allOf": [
    {
      "if": { "properties": { "type": { "const": "fire" } } },
      "then": { "properties": { "extinguisher_used": { "type": "boolean", "title": "Extinguisher Used?" } } }
    },
    {
      "if": { "properties": { "type": { "const": "flood" } } },
      "then": {
        "properties": { "water_level": { "type": "integer", "title": "Water Level (cm)" } },
        "required": ["water_level"]
      }
    }
  ]
}
```

## Custom extensions

Extensions let you add custom properties to field schemas. The extension function
receives the full `FieldDefinition` and returns properties to merge, or `null` to skip.

```ts
const config: SchemaBuilderConfig = {
  extensions: {
    // Add x-default-now to date/time fields that have defaultNow set
    "x-default-now": (field) =>
      field.defaultNow ? { "x-default-now": true } : null,

    // Add x-searchable to string fields
    "x-searchable": (field) =>
      field.type === "string" ? { "x-searchable": true } : null,
  },
};
```

The `parseSchema` function detects `x-default-now` automatically and sets `field.defaultNow`.
For other custom extensions, you can read them from the raw JSON Schema after parsing.

## Development

```bash
# Install
bun install

# Run tests
bun run test       # or: mise test

# Type check
bun run typecheck   # or: mise typecheck

# Lint
bun run lint        # or: mise lint

# Build
bun run build       # or: mise build
```

## License

MIT
