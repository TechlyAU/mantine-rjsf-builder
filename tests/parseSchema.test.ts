import { describe, expect, it } from "vitest";

import { buildSchema } from "../src/buildSchema";
import { parseSchema } from "../src/parseSchema";
import type { FieldDefinition, SchemaBuilderConfig } from "../src/types";

describe("parseSchema", () => {
	it("parses empty schema", () => {
		const fields = parseSchema({ type: "object", properties: {} });
		expect(fields).toEqual([]);
	});

	it("parses string field", () => {
		const schema = {
			type: "object",
			properties: {
				name: { type: "string", title: "Name" },
			},
			required: ["name"],
		};
		const fields = parseSchema(schema);
		expect(fields).toHaveLength(1);
		expect(fields[0].type).toBe("string");
		expect(fields[0].title).toBe("Name");
		expect(fields[0].required).toBe(true);
	});

	it("parses select field with oneOf", () => {
		const schema = {
			type: "object",
			properties: {
				status: {
					title: "Status",
					oneOf: [
						{ const: "open", title: "Open" },
						{ const: "closed", title: "Closed" },
					],
				},
			},
		};
		const fields = parseSchema(schema);
		expect(fields[0].type).toBe("select");
		expect(fields[0].options).toEqual([
			{ value: "open", label: "Open" },
			{ value: "closed", label: "Closed" },
		]);
	});

	it("round-trips through build and parse", () => {
		const originalFields: FieldDefinition[] = [
			{
				id: "1",
				name: "title",
				title: "Title",
				type: "string",
				required: true,
			},
			{
				id: "2",
				name: "count",
				title: "Count",
				type: "integer",
				required: false,
			},
			{
				id: "3",
				name: "active",
				title: "Active",
				type: "boolean",
				required: false,
			},
		];

		const { jsonSchema, uiSchema } = buildSchema(originalFields);
		const parsed = parseSchema(jsonSchema, uiSchema);

		expect(parsed).toHaveLength(3);
		expect(parsed[0].name).toBe("title");
		expect(parsed[0].type).toBe("string");
		expect(parsed[0].required).toBe(true);
		expect(parsed[1].name).toBe("count");
		expect(parsed[1].type).toBe("integer");
		expect(parsed[2].name).toBe("active");
		expect(parsed[2].type).toBe("boolean");
	});

	it("round-trips with custom config", () => {
		const config: SchemaBuilderConfig = {
			fieldNameFormat: "snake_case",
			selectFormat: "oneOf",
			widgetMapping: { datetime: "DateTimeWidget" },
			uiSchemaDefaults: { datetime: { "ui:emptyValue": "" } },
			extensions: {
				"x-default-now": (f) =>
					f.defaultNow ? { "x-default-now": true } : null,
			},
		};

		const originalFields: FieldDefinition[] = [
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
				name: "Status",
				title: "Status",
				type: "select",
				required: true,
				options: [
					{ value: "open", label: "Open" },
					{ value: "resolved", label: "Resolved" },
				],
			},
		];

		const schema = buildSchema(originalFields, config);
		const parsed = parseSchema(
			schema.jsonSchema,
			schema.uiSchema,
			config,
		);

		expect(parsed).toHaveLength(2);
		expect(parsed[0].name).toBe("incident_date");
		expect(parsed[0].type).toBe("datetime");
		expect(parsed[0].defaultNow).toBe(true);
		expect(parsed[1].name).toBe("status");
		expect(parsed[1].type).toBe("select");
		expect(parsed[1].options).toHaveLength(2);
	});
});
