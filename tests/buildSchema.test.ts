import { describe, expect, it } from "vitest";

import { buildSchema } from "../src/buildSchema";
import type { FieldDefinition, SchemaBuilderConfig } from "../src/types";

describe("buildSchema", () => {
	it("builds empty schema for no fields", () => {
		const { jsonSchema, uiSchema } = buildSchema([]);
		expect(jsonSchema.type).toBe("object");
		expect(jsonSchema.properties).toEqual({});
		expect(uiSchema["ui:order"]).toEqual([]);
	});

	it("builds string field", () => {
		const fields: FieldDefinition[] = [
			{
				id: "1",
				name: "title",
				title: "Title",
				type: "string",
				required: true,
			},
		];
		const { jsonSchema } = buildSchema(fields);
		const props = jsonSchema.properties as Record<
			string,
			Record<string, unknown>
		>;
		expect(props.title.type).toBe("string");
		expect(props.title.title).toBe("Title");
		expect(jsonSchema.required).toEqual(["title"]);
	});

	it("builds boolean field as never required", () => {
		const fields: FieldDefinition[] = [
			{
				id: "1",
				name: "active",
				title: "Active",
				type: "boolean",
				required: true,
			},
		];
		const { jsonSchema } = buildSchema(fields);
		expect(jsonSchema.required).toBeUndefined();
	});

	it("builds select field with oneOf format", () => {
		const fields: FieldDefinition[] = [
			{
				id: "1",
				name: "status",
				title: "Status",
				type: "select",
				required: false,
				options: [
					{ value: "open", label: "Open" },
					{ value: "closed", label: "Closed" },
				],
			},
		];
		const { jsonSchema } = buildSchema(fields, {
			selectFormat: "oneOf",
		});
		const props = jsonSchema.properties as Record<
			string,
			Record<string, unknown>
		>;
		expect(props.status.oneOf).toEqual([
			{ const: "open", title: "Open" },
			{ const: "closed", title: "Closed" },
		]);
	});

	it("builds select field with enum format", () => {
		const fields: FieldDefinition[] = [
			{
				id: "1",
				name: "status",
				title: "Status",
				type: "select",
				required: false,
				options: [
					{ value: "open", label: "Open" },
					{ value: "closed", label: "Closed" },
				],
			},
		];
		const { jsonSchema } = buildSchema(fields, {
			selectFormat: "enum",
		});
		const props = jsonSchema.properties as Record<
			string,
			Record<string, unknown>
		>;
		expect(props.status.enum).toEqual(["open", "closed"]);
	});

	it("applies widget mapping to uiSchema", () => {
		const fields: FieldDefinition[] = [
			{
				id: "1",
				name: "when",
				title: "When",
				type: "datetime",
				required: false,
			},
		];
		const { uiSchema } = buildSchema(fields, {
			widgetMapping: { datetime: "DateTimeWidget" },
		});
		const fieldUi = uiSchema.when as Record<string, unknown>;
		expect(fieldUi["ui:widget"]).toBe("DateTimeWidget");
	});

	it("applies field name format", () => {
		const fields: FieldDefinition[] = [
			{
				id: "1",
				name: "First Name",
				title: "First Name",
				type: "string",
				required: false,
			},
		];
		const { jsonSchema } = buildSchema(fields, {
			fieldNameFormat: "snake_case",
		});
		const props = jsonSchema.properties as Record<string, unknown>;
		expect(props).toHaveProperty("first_name");
	});

	it("applies extensions", () => {
		const fields: FieldDefinition[] = [
			{
				id: "1",
				name: "created",
				title: "Created",
				type: "datetime",
				required: false,
				defaultNow: true,
			},
		];
		const { jsonSchema } = buildSchema(fields, {
			extensions: {
				"x-default-now": (f) =>
					f.defaultNow ? { "x-default-now": true } : null,
			},
		});
		const props = jsonSchema.properties as Record<
			string,
			Record<string, unknown>
		>;
		expect(props.created["x-default-now"]).toBe(true);
	});

	it("builds conditional fields", () => {
		const fields: FieldDefinition[] = [
			{
				id: "1",
				name: "type",
				title: "Type",
				type: "select",
				required: true,
				options: [
					{ value: "a", label: "A" },
					{ value: "b", label: "B" },
				],
				conditions: [
					{
						whenValue: "a",
						fields: [
							{
								id: "2",
								name: "extra",
								title: "Extra",
								type: "string",
								required: true,
							},
						],
					},
				],
			},
		];
		const { jsonSchema } = buildSchema(fields);
		expect(jsonSchema.allOf).toBeDefined();
		const allOf = jsonSchema.allOf as Record<string, unknown>[];
		expect(allOf).toHaveLength(1);
		const ifClause = allOf[0].if as Record<string, unknown>;
		const thenClause = allOf[0].then as Record<string, unknown>;
		expect(ifClause.properties).toEqual({ type: { const: "a" } });
		expect(thenClause.properties).toHaveProperty("extra");
		expect(thenClause.required).toEqual(["extra"]);
	});

	describe("custom config", () => {
		it("generates schema with full config options", () => {
			const config: SchemaBuilderConfig = {
				schemaVersion: "https://json-schema.org/draft/2020-12/schema",
				schemaIdPrefix: "https://example.com/schemas/",
				fieldNameFormat: "snake_case",
				selectFormat: "oneOf",
				widgetMapping: {
					datetime: "DateTimeWidget",
					date: "DateWidget",
				},
				uiSchemaDefaults: {
					datetime: { "ui:emptyValue": "" },
					string: { "ui:emptyValue": "" },
				},
				neverRequired: ["boolean"],
				extensions: {
					"x-default-now": (f) =>
						f.defaultNow ? { "x-default-now": true } : null,
				},
				generateOrder: true,
			};

			const fields: FieldDefinition[] = [
				{
					id: "1",
					name: "Incident Date",
					title: "Incident Date",
					type: "datetime",
					required: true,
					defaultNow: true,
				},
				{
					id: "2",
					name: "Description",
					title: "Description",
					type: "string",
					required: true,
				},
			];
			const { jsonSchema, uiSchema } = buildSchema(fields, config);

			expect(jsonSchema.$schema).toBe(
				"https://json-schema.org/draft/2020-12/schema",
			);
			expect(jsonSchema.$id).toBe(
				"https://example.com/schemas/form.json",
			);

			const props = jsonSchema.properties as Record<
				string,
				Record<string, unknown>
			>;
			expect(props).toHaveProperty("incident_date");
			expect(props.incident_date["x-default-now"]).toBe(true);
			expect(props.incident_date.format).toBe("date-time");

			const dtUi = uiSchema.incident_date as Record<string, unknown>;
			expect(dtUi["ui:widget"]).toBe("DateTimeWidget");
			expect(dtUi["ui:emptyValue"]).toBe("");
		});
	});
});
