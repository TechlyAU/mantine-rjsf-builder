/**
 * Supported field types for the schema builder.
 *
 * These map to JSON Schema types and formats:
 * - `"string"` → `{ type: "string" }`
 * - `"integer"` → `{ type: "integer" }`
 * - `"number"` → `{ type: "number" }`
 * - `"boolean"` → `{ type: "boolean" }`
 * - `"date"` → `{ type: "string", format: "date" }`
 * - `"datetime"` → `{ type: "string", format: "date-time" }`
 * - `"time"` → `{ type: "string", format: "time" }`
 * - `"select"` → `{ oneOf: [...] }` or `{ enum: [...] }` depending on config
 * - `"multiselect"` → `{ type: "array", items: { oneOf | enum }, uniqueItems: true }`
 */
export type FieldType =
	| "string"
	| "integer"
	| "number"
	| "boolean"
	| "date"
	| "datetime"
	| "time"
	| "select"
	| "multiselect";

/** A value/label pair for select and multiselect fields. */
export interface SelectOption {
	/** The value stored in form data when this option is selected. */
	value: string;
	/** The display label shown to the user. */
	label: string;
}

/**
 * A conditional field group that is shown when a parent field matches a value.
 *
 * Rendered as JSON Schema `allOf` with `if`/`then` clauses:
 * ```json
 * { "if": { "properties": { "parent": { "const": "value" } } },
 *   "then": { "properties": { ... }, "required": [...] } }
 * ```
 */
export interface FieldCondition {
	/** The parent field value(s) that trigger this condition. A string matches a single value; an array matches any of the values. */
	whenValue: string | string[];
	/** The child fields to show when the condition is met. */
	fields: FieldDefinition[];
}

/**
 * A single field in the form builder.
 *
 * This is the intermediate representation used between the visual builder UI
 * and the JSON Schema output. Fields are converted to JSON Schema properties
 * by {@link buildSchema} and parsed back by {@link parseSchema}.
 */
export interface FieldDefinition {
	/** Unique identifier for this field (used as React key in the builder UI). */
	id: string;
	/** The property name in the generated JSON Schema. Auto-formatted by {@link SchemaBuilderConfig.fieldNameFormat}. */
	name: string;
	/** Human-readable label. Becomes the `title` in JSON Schema. */
	title: string;
	/** The field type. See {@link FieldType} for the mapping to JSON Schema. */
	type: FieldType;
	/** Whether the field is required. Fields whose type is in {@link SchemaBuilderConfig.neverRequired} are excluded from `required` even when `true`. */
	required: boolean;
	/** Options for `select` and `multiselect` fields. */
	options?: SelectOption[];
	/** A `$ref` pointer to a shared definition for select options (e.g. `"#/$defs/StatusEnum"`). When set, `options` is ignored. */
	optionsRef?: string;
	/** If `true`, the schema includes a custom `x-default-now` extension (requires a matching extension in config). Typically used for date/time fields. */
	defaultNow?: boolean;
	/** If `true`, the field renders as a textarea and sets `maxLength: 10000` in the schema. Only meaningful for `"string"` fields. */
	longText?: boolean;
	/** If `true`, the UI Schema sets `"ui:widget": "hidden"`. */
	hidden?: boolean;
	/** Conditional child field groups. See {@link FieldCondition}. */
	conditions?: FieldCondition[];
}

/**
 * Configuration for schema generation.
 *
 * Every option has a sensible default — pass only the values you want to override.
 * Create a config object once and reuse it across your application for consistent output.
 *
 * @example
 * ```ts
 * const myConfig: SchemaBuilderConfig = {
 *   fieldNameFormat: "snake_case",
 *   selectFormat: "oneOf",
 *   widgetMapping: { datetime: "DateTimeWidget" },
 *   extensions: {
 *     "x-default-now": (f) => f.defaultNow ? { "x-default-now": true } : null,
 *   },
 * };
 *
 * const { jsonSchema, uiSchema } = buildSchema(fields, myConfig);
 * ```
 */
export interface SchemaBuilderConfig {
	/** The `$schema` URI written to the root of the JSON Schema. @default `"https://json-schema.org/draft/2020-12/schema"` */
	schemaVersion?: string;

	/** If set, the generated schema includes `$id: "${schemaIdPrefix}form.json"`. */
	schemaIdPrefix?: string;

	/**
	 * How field names are formatted in the generated schema.
	 * - `"snake_case"` — `"First Name"` → `"first_name"`
	 * - `"camelCase"` — `"First Name"` → `"firstName"`
	 * - `"as-is"` — no transformation
	 * @default `"as-is"`
	 */
	fieldNameFormat?: "snake_case" | "camelCase" | "as-is";

	/**
	 * How select/multiselect options are represented in JSON Schema.
	 * - `"oneOf"` — `{ oneOf: [{ const: "val", title: "Label" }, ...] }` (preserves labels)
	 * - `"enum"` — `{ enum: ["val1", "val2"] }` (values only, no labels)
	 * @default `"oneOf"`
	 */
	selectFormat?: "oneOf" | "enum";

	/**
	 * Maps field types to RJSF widget names in the UI Schema.
	 *
	 * @example
	 * ```ts
	 * widgetMapping: {
	 *   datetime: "DateTimeWidget",
	 *   date: "DateWidget",
	 *   integer: "UpDownWidget",
	 * }
	 * ```
	 */
	widgetMapping?: Partial<Record<FieldType, string | null>>;

	/**
	 * Default UI Schema properties applied to every field of a given type.
	 *
	 * @example
	 * ```ts
	 * uiSchemaDefaults: {
	 *   datetime: { "ui:emptyValue": "", "ui:options": { valueFormat: "YYYY-MM-DDTHH:mm:ss[Z]" } },
	 *   string: { "ui:emptyValue": "" },
	 * }
	 * ```
	 */
	uiSchemaDefaults?: Partial<Record<FieldType, Record<string, unknown>>>;

	/**
	 * Field types that are never added to the `required` array, even when
	 * `field.required` is `true`. Useful for booleans which default to `false`.
	 * @default `["boolean"]`
	 */
	neverRequired?: FieldType[];

	/**
	 * Custom JSON Schema extensions applied per field.
	 *
	 * Each extension is a function that receives a {@link FieldDefinition} and returns
	 * additional properties to merge into the field's JSON Schema, or `null` to skip.
	 *
	 * @example
	 * ```ts
	 * extensions: {
	 *   "x-default-now": (field) =>
	 *     field.defaultNow ? { "x-default-now": true } : null,
	 * }
	 * ```
	 */
	extensions?: Record<
		string,
		(field: FieldDefinition) => Record<string, unknown> | null
	>;

	/**
	 * Whether to generate a `"ui:order"` array in the UI Schema.
	 * The order matches the field array order passed to `buildSchema`.
	 * @default `true`
	 */
	generateOrder?: boolean;
}

/** The output of {@link buildSchema}: a JSON Schema and a matching RJSF UI Schema. */
export interface SchemaOutput {
	/** A valid JSON Schema object (draft 2020-12 by default). */
	jsonSchema: Record<string, unknown>;
	/** An RJSF-compatible UI Schema with widget mappings, defaults, and field order. */
	uiSchema: Record<string, unknown>;
}
