/**
 * JSON Schema + UI Schema → FieldDefinition parser.
 *
 * The reverse of {@link buildSchema}. Takes a JSON Schema and optional UI Schema
 * and reconstructs the {@link FieldDefinition} array that produced them.
 *
 * Pass the same {@link SchemaBuilderConfig} used for generation to get accurate
 * round-trip results (especially for widget → field type reverse mapping).
 *
 * @module
 */

import type {
	FieldCondition,
	FieldDefinition,
	FieldType,
	SchemaBuilderConfig,
	SelectOption,
} from "./types";

// ---------------------------------------------------------------------------
// Field type inference
// ---------------------------------------------------------------------------

/**
 * Infer a {@link FieldType} from a JSON Schema fragment and optional UI widget.
 *
 * When a config with `widgetMapping` is provided, the widget name is checked
 * first (reverse lookup). This ensures that e.g. a `DateTimeWidget` maps back
 * to `"datetime"` rather than falling through to `"string"` with `format`.
 */
function inferFieldType(
	schema: Record<string, unknown>,
	uiWidget: string | undefined,
	config?: SchemaBuilderConfig,
): FieldType {
	if (config?.widgetMapping) {
		for (const [fieldType, widget] of Object.entries(
			config.widgetMapping,
		)) {
			if (widget && uiWidget === widget) {
				return fieldType as FieldType;
			}
		}
	}

	if (schema.type === "array") return "multiselect";
	if (schema.oneOf) return "select";
	if (schema.type === "boolean") return "boolean";
	if (schema.type === "integer") return "integer";
	if (schema.type === "number") return "number";
	if (schema.format === "date-time") return "datetime";
	if (schema.format === "date") return "date";
	if (schema.format === "time") return "time";
	if (schema.enum) return "select";
	return "string";
}

// ---------------------------------------------------------------------------
// Option extraction
// ---------------------------------------------------------------------------

/**
 * Extract {@link SelectOption} values from a JSON Schema property.
 *
 * Handles both `oneOf` (with `const`/`title`) and `enum` (values only) formats,
 * as well as multiselect schemas where options live inside `items`.
 */
function extractOptions(
	schema: Record<string, unknown>,
): SelectOption[] | undefined {
	if (schema.oneOf && Array.isArray(schema.oneOf)) {
		return (schema.oneOf as Record<string, unknown>[]).map((item) => ({
			value: String(item.const ?? ""),
			label: String(item.title ?? item.const ?? ""),
		}));
	}
	if (schema.enum && Array.isArray(schema.enum)) {
		return (schema.enum as string[]).map((v) => ({
			value: String(v),
			label: String(v),
		}));
	}
	if (
		schema.type === "array" &&
		schema.items &&
		typeof schema.items === "object"
	) {
		const items = schema.items as Record<string, unknown>;
		if (items.oneOf && Array.isArray(items.oneOf)) {
			return (items.oneOf as Record<string, unknown>[]).map((item) => ({
				value: String(item.const ?? ""),
				label: String(item.title ?? item.const ?? ""),
			}));
		}
		if (items.enum && Array.isArray(items.enum)) {
			return (items.enum as string[]).map((v) => ({
				value: String(v),
				label: String(v),
			}));
		}
	}
	return undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a JSON Schema + UI Schema back into an array of {@link FieldDefinition}.
 *
 * This is the reverse of {@link buildSchema}. Useful for loading a previously
 * saved schema into the {@link SchemaBuilder} component for editing.
 *
 * @param jsonSchema - The JSON Schema object to parse.
 * @param uiSchema   - The RJSF UI Schema (optional but recommended for accurate type inference).
 * @param config     - The same config used when the schema was generated (optional but
 *                     recommended for accurate widget → field type reverse mapping).
 * @returns An array of {@link FieldDefinition} objects.
 *
 * @example
 * ```ts
 * import { parseSchema } from "mantine-rjsf-builder";
 *
 * const fields = parseSchema(existingJsonSchema, existingUiSchema, myConfig);
 * // Pass `fields` to <SchemaBuilder initialSchema={...} />
 * ```
 */
export function parseSchema(
	jsonSchema: Record<string, unknown>,
	uiSchema?: Record<string, unknown>,
	config?: SchemaBuilderConfig,
): FieldDefinition[] {
	const properties =
		(jsonSchema.properties as Record<string, Record<string, unknown>>) ?? {};
	const required = (jsonSchema.required as string[]) ?? [];
	const allOf =
		(jsonSchema.allOf as Record<string, unknown>[] | undefined) ?? [];
	const ui = uiSchema ?? {};

	const fields: FieldDefinition[] = [];
	let idCounter = 0;

	for (const [name, schema] of Object.entries(properties)) {
		idCounter++;
		const fieldUi = (ui[name] as Record<string, unknown>) ?? {};
		const uiWidget = fieldUi["ui:widget"] as string | undefined;
		const type = inferFieldType(schema, uiWidget, config);

		const field: FieldDefinition = {
			id: `field-${idCounter}`,
			name,
			title: (schema.title as string) ?? name,
			type,
			required: required.includes(name),
			options: extractOptions(schema),
			defaultNow: schema["x-default-now"] === true,
			longText:
				uiWidget === "textarea" ||
				(schema.maxLength !== undefined &&
					(schema.maxLength as number) > 1000),
			hidden: uiWidget === "hidden",
		};

		const conditions = parseConditions(
			allOf,
			name,
			ui,
			config,
			idCounter,
		);
		if (conditions.length > 0) {
			field.conditions = conditions;
		}

		fields.push(field);
	}

	return fields;
}

// ---------------------------------------------------------------------------
// Conditional field parsing
// ---------------------------------------------------------------------------

/**
 * Extract {@link FieldCondition} entries from `allOf` clauses that reference
 * the given field name in their `if` clause.
 */
function parseConditions(
	allOf: Record<string, unknown>[],
	fieldName: string,
	ui: Record<string, unknown>,
	config: SchemaBuilderConfig | undefined,
	baseId: number,
): FieldCondition[] {
	const conditions: FieldCondition[] = [];

	for (const clause of allOf) {
		const ifClause = clause.if as Record<string, unknown> | undefined;
		const thenClause = clause.then as Record<string, unknown> | undefined;
		if (!ifClause || !thenClause) continue;

		const ifProps = ifClause.properties as
			| Record<string, Record<string, unknown>>
			| undefined;
		if (!ifProps || !ifProps[fieldName]) continue;

		const fieldCondition = ifProps[fieldName];
		const whenValue =
			fieldCondition.const !== undefined
				? String(fieldCondition.const)
				: fieldCondition.enum
					? (fieldCondition.enum as string[])
					: "";

		const thenProps = thenClause.properties as
			| Record<string, Record<string, unknown>>
			| undefined;
		const thenRequired = (thenClause.required as string[]) ?? [];
		if (!thenProps) continue;

		let childId = baseId * 100;
		const childFields: FieldDefinition[] = [];

		for (const [childName, childSchema] of Object.entries(thenProps)) {
			childId++;
			const childUi = (ui[childName] as Record<string, unknown>) ?? {};
			const childWidget = childUi["ui:widget"] as string | undefined;
			const childType = inferFieldType(childSchema, childWidget, config);

			childFields.push({
				id: `field-${childId}`,
				name: childName,
				title: (childSchema.title as string) ?? childName,
				type: childType,
				required: thenRequired.includes(childName),
				options: extractOptions(childSchema),
				defaultNow: childSchema["x-default-now"] === true,
				longText:
					childWidget === "textarea" ||
					(childSchema.maxLength !== undefined &&
						(childSchema.maxLength as number) > 1000),
				hidden: childWidget === "hidden",
			});
		}

		conditions.push({ whenValue, fields: childFields });
	}

	return conditions;
}
