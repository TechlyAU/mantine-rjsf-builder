/**
 * Config-driven JSON Schema + RJSF UI Schema generator.
 *
 * Converts an array of {@link FieldDefinition} objects into a pair of schemas
 * ready for use with `@rjsf/core` (or any RJSF theme like `@rjsf/mantine`).
 *
 * All behaviour is controlled by the optional {@link SchemaBuilderConfig}.
 * Pass the same config to {@link parseSchema} for round-trip fidelity.
 *
 * @module
 */

import type {
	FieldCondition,
	FieldDefinition,
	FieldType,
	SchemaBuilderConfig,
	SchemaOutput,
} from "./types";

/** Defaults applied when no config (or a partial config) is provided. */
const DEFAULT_CONFIG: Required<SchemaBuilderConfig> = {
	schemaVersion: "https://json-schema.org/draft/2020-12/schema",
	schemaIdPrefix: "",
	fieldNameFormat: "as-is",
	selectFormat: "oneOf",
	widgetMapping: {},
	uiSchemaDefaults: {},
	neverRequired: ["boolean"],
	extensions: {},
	generateOrder: true,
};

// ---------------------------------------------------------------------------
// Name formatting helpers
// ---------------------------------------------------------------------------

function toSnakeCase(str: string): string {
	return str
		.replace(/\s+/g, "_")
		.replace(/([A-Z])/g, "_$1")
		.toLowerCase()
		.replace(/^_/, "")
		.replace(/_+/g, "_");
}

function toCamelCase(str: string): string {
	return str
		.replace(/\s+/g, "_")
		.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
		.replace(/^[A-Z]/, (c) => c.toLowerCase());
}

function formatFieldName(
	name: string,
	format: "snake_case" | "camelCase" | "as-is",
): string {
	switch (format) {
		case "snake_case":
			return toSnakeCase(name);
		case "camelCase":
			return toCamelCase(name);
		default:
			return name;
	}
}

// ---------------------------------------------------------------------------
// Per-field schema builders
// ---------------------------------------------------------------------------

/**
 * Build the JSON Schema fragment for a single field.
 *
 * Maps {@link FieldType} to the appropriate JSON Schema `type`, `format`,
 * `oneOf`/`enum`, etc. Applies any custom extensions from config.
 */
function buildFieldSchema(
	field: FieldDefinition,
	config: Required<SchemaBuilderConfig>,
): Record<string, unknown> {
	const schema: Record<string, unknown> = {};

	switch (field.type) {
		case "string":
			schema.type = "string";
			if (field.longText) {
				schema.maxLength = 10000;
			}
			break;
		case "integer":
			schema.type = "integer";
			break;
		case "number":
			schema.type = "number";
			break;
		case "boolean":
			schema.type = "boolean";
			break;
		case "date":
			schema.type = "string";
			schema.format = "date";
			break;
		case "datetime":
			schema.type = "string";
			schema.format = "date-time";
			break;
		case "time":
			schema.type = "string";
			schema.format = "time";
			break;
		case "select":
			if (field.optionsRef) {
				schema.$ref = field.optionsRef;
			} else if (field.options && config.selectFormat === "oneOf") {
				schema.oneOf = field.options.map((opt) => ({
					const: opt.value,
					title: opt.label,
				}));
			} else if (field.options && config.selectFormat === "enum") {
				schema.type = "string";
				schema.enum = field.options.map((opt) => opt.value);
			} else {
				schema.type = "string";
			}
			break;
		case "multiselect":
			schema.type = "array";
			schema.uniqueItems = true;
			if (field.optionsRef) {
				schema.items = { $ref: field.optionsRef };
			} else if (field.options && config.selectFormat === "oneOf") {
				schema.items = {
					oneOf: field.options.map((opt) => ({
						const: opt.value,
						title: opt.label,
					})),
				};
			} else if (field.options && config.selectFormat === "enum") {
				schema.items = {
					type: "string",
					enum: field.options.map((opt) => opt.value),
				};
			} else {
				schema.items = { type: "string" };
			}
			break;
	}

	schema.title = field.title;

	for (const [, extFn] of Object.entries(config.extensions)) {
		const result = extFn(field);
		if (result) {
			Object.assign(schema, result);
		}
	}

	return schema;
}

/**
 * Build the RJSF UI Schema fragment for a single field.
 *
 * Applies widget mappings, per-type defaults, and special flags
 * (`longText` → textarea, `hidden` → hidden widget).
 */
function buildFieldUiSchema(
	field: FieldDefinition,
	config: Required<SchemaBuilderConfig>,
): Record<string, unknown> {
	const ui: Record<string, unknown> = {};

	const defaults = config.uiSchemaDefaults[field.type];
	if (defaults) {
		Object.assign(ui, defaults);
	}

	const widget = config.widgetMapping[field.type];
	if (widget) {
		ui["ui:widget"] = widget;
	}

	if (field.longText) {
		ui["ui:widget"] = "textarea";
	}

	if (field.hidden) {
		ui["ui:widget"] = "hidden";
	}

	return ui;
}

// ---------------------------------------------------------------------------
// Conditional fields (allOf / if-then)
// ---------------------------------------------------------------------------

/**
 * Build JSON Schema `allOf` entries for conditional field groups.
 *
 * Each {@link FieldCondition} becomes an `{ if, then }` clause.
 * Child fields' UI Schema entries and order are appended as a side effect.
 */
function buildConditions(
	conditions: FieldCondition[],
	parentName: string,
	config: Required<SchemaBuilderConfig>,
	uiSchema: Record<string, unknown>,
	order: string[],
): Record<string, unknown>[] {
	return conditions.map((cond) => {
		const conditionalProperties: Record<string, unknown> = {};
		const conditionalRequired: string[] = [];

		for (const childField of cond.fields) {
			const childName = formatFieldName(
				childField.name,
				config.fieldNameFormat,
			);
			conditionalProperties[childName] = buildFieldSchema(
				childField,
				config,
			);

			const childUi = buildFieldUiSchema(childField, config);
			if (Object.keys(childUi).length > 0) {
				uiSchema[childName] = childUi;
			}

			if (
				childField.required &&
				!config.neverRequired.includes(childField.type)
			) {
				conditionalRequired.push(childName);
			}

			order.push(childName);
		}

		const ifClause: Record<string, unknown> = {
			properties: {
				[parentName]: Array.isArray(cond.whenValue)
					? { enum: cond.whenValue }
					: { const: cond.whenValue },
			},
		};

		const thenClause: Record<string, unknown> = {
			properties: conditionalProperties,
		};
		if (conditionalRequired.length > 0) {
			thenClause.required = conditionalRequired;
		}

		return { if: ifClause, then: thenClause };
	});
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert an array of field definitions into a JSON Schema + RJSF UI Schema pair.
 *
 * This is a pure function with no side effects. The output is fully determined
 * by the input fields and config.
 *
 * @param fields - The fields to include in the schema.
 * @param config - Optional config controlling naming, widgets, extensions, etc.
 *                 Unset options fall back to sensible defaults.
 * @returns A {@link SchemaOutput} containing `jsonSchema` and `uiSchema`.
 *
 * @example
 * ```ts
 * import { buildSchema } from "mantine-rjsf-builder";
 *
 * const { jsonSchema, uiSchema } = buildSchema([
 *   { id: "1", name: "email", title: "Email", type: "string", required: true },
 *   { id: "2", name: "age", title: "Age", type: "integer", required: false },
 * ]);
 * ```
 */
export function buildSchema(
	fields: FieldDefinition[],
	config?: SchemaBuilderConfig,
): SchemaOutput {
	const cfg: Required<SchemaBuilderConfig> = {
		...DEFAULT_CONFIG,
		...config,
	};

	const properties: Record<string, unknown> = {};
	const required: string[] = [];
	const uiSchema: Record<string, unknown> = {};
	const order: string[] = [];
	const allOf: Record<string, unknown>[] = [];

	for (const field of fields) {
		const name = formatFieldName(field.name, cfg.fieldNameFormat);
		properties[name] = buildFieldSchema(field, cfg);

		const fieldUi = buildFieldUiSchema(field, cfg);
		if (Object.keys(fieldUi).length > 0) {
			uiSchema[name] = fieldUi;
		}

		if (field.required && !cfg.neverRequired.includes(field.type)) {
			required.push(name);
		}

		order.push(name);

		if (field.conditions && field.conditions.length > 0) {
			allOf.push(
				...buildConditions(field.conditions, name, cfg, uiSchema, order),
			);
		}
	}

	const jsonSchema: Record<string, unknown> = {
		$schema: cfg.schemaVersion,
		type: "object",
		properties,
	};

	if (cfg.schemaIdPrefix) {
		jsonSchema.$id = `${cfg.schemaIdPrefix}form.json`;
	}

	if (required.length > 0) {
		jsonSchema.required = required;
	}

	if (allOf.length > 0) {
		jsonSchema.allOf = allOf;
	}

	if (cfg.generateOrder) {
		uiSchema["ui:order"] = order;
	}

	return { jsonSchema, uiSchema };
}
