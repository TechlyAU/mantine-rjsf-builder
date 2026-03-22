import { Accordion, Box, Button, Group, Stack, Text } from "@mantine/core";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

import { buildSchema } from "../buildSchema";
import { parseSchema } from "../parseSchema";
import type {
	FieldDefinition,
	FieldType,
	SchemaBuilderConfig,
	SchemaOutput,
} from "../types";

import { FieldEditor } from "./FieldEditor";

/**
 * Props for the {@link SchemaBuilder} component.
 */
interface SchemaBuilderProps {
	/**
	 * Configuration controlling how schemas are generated.
	 * Passed through to {@link buildSchema} and {@link parseSchema}.
	 * Define this once and reuse it for consistent output across your app.
	 */
	config?: SchemaBuilderConfig;

	/**
	 * An existing schema to load into the builder for editing.
	 * Parsed into {@link FieldDefinition} objects via {@link parseSchema} on mount.
	 */
	initialSchema?: SchemaOutput;

	/**
	 * Called whenever the user adds, edits, removes, or reorders a field.
	 * Receives the freshly generated JSON Schema and UI Schema.
	 */
	onChange: (schema: SchemaOutput) => void;
}

let nextId = 1;

function generateId(): string {
	nextId++;
	return `field-${nextId}-${Date.now()}`;
}

/**
 * A visual form builder that outputs JSON Schema + RJSF UI Schema.
 *
 * Built entirely with Mantine components. Each field is displayed in an
 * accordion panel with inline editing for title, type, required flag,
 * select options, and type-specific settings.
 *
 * @example
 * ```tsx
 * import { SchemaBuilder } from "mantine-rjsf-builder";
 * import type { SchemaBuilderConfig } from "mantine-rjsf-builder";
 *
 * const config: SchemaBuilderConfig = {
 *   fieldNameFormat: "snake_case",
 *   selectFormat: "oneOf",
 * };
 *
 * function MyFormDesigner() {
 *   return (
 *     <SchemaBuilder
 *       config={config}
 *       onChange={({ jsonSchema, uiSchema }) => {
 *         console.log(JSON.stringify(jsonSchema, null, 2));
 *       }}
 *     />
 *   );
 * }
 * ```
 */
export function SchemaBuilder({
	config,
	initialSchema,
	onChange,
}: SchemaBuilderProps) {
	const [fields, setFields] = useState<FieldDefinition[]>(() => {
		if (initialSchema) {
			return parseSchema(
				initialSchema.jsonSchema,
				initialSchema.uiSchema,
				config,
			);
		}
		return [];
	});

	const emitChange = useCallback(
		(updatedFields: FieldDefinition[]) => {
			const schema = buildSchema(updatedFields, config);
			onChange(schema);
		},
		[config, onChange],
	);

	const addField = useCallback(
		(type: FieldType = "string") => {
			const newField: FieldDefinition = {
				id: generateId(),
				name: `field_${fields.length + 1}`,
				title: `Field ${fields.length + 1}`,
				type,
				required: false,
			};
			const updated = [...fields, newField];
			setFields(updated);
			emitChange(updated);
		},
		[fields, emitChange],
	);

	const updateField = useCallback(
		(id: string, updates: Partial<FieldDefinition>) => {
			const updated = fields.map((f) =>
				f.id === id ? { ...f, ...updates } : f,
			);
			setFields(updated);
			emitChange(updated);
		},
		[fields, emitChange],
	);

	const removeField = useCallback(
		(id: string) => {
			const updated = fields.filter((f) => f.id !== id);
			setFields(updated);
			emitChange(updated);
		},
		[fields, emitChange],
	);

	const moveField = useCallback(
		(id: string, direction: "up" | "down") => {
			const idx = fields.findIndex((f) => f.id === id);
			if (idx === -1) return;
			const newIdx = direction === "up" ? idx - 1 : idx + 1;
			if (newIdx < 0 || newIdx >= fields.length) return;
			const updated = [...fields];
			[updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
			setFields(updated);
			emitChange(updated);
		},
		[fields, emitChange],
	);

	return (
		<Stack gap="sm">
			{fields.length === 0 ? (
				<Text c="dimmed" ta="center" py="xl">
					No fields yet. Add a field to get started.
				</Text>
			) : (
				<Accordion variant="separated">
					{fields.map((field, idx) => (
						<Accordion.Item key={field.id} value={field.id}>
							<Accordion.Control>
								<Group gap="xs">
									<Text size="sm" fw={500}>
										{field.title}
									</Text>
									<Text size="xs" c="dimmed">
										({field.type}
										{field.required ? ", required" : ""})
									</Text>
								</Group>
							</Accordion.Control>
							<Accordion.Panel>
								<FieldEditor
									field={field}
									onChange={(updates) => updateField(field.id, updates)}
									onRemove={() => removeField(field.id)}
									onMoveUp={
										idx > 0 ? () => moveField(field.id, "up") : undefined
									}
									onMoveDown={
										idx < fields.length - 1
											? () => moveField(field.id, "down")
											: undefined
									}
								/>
							</Accordion.Panel>
						</Accordion.Item>
					))}
				</Accordion>
			)}

			<Box>
				<Button
					size="sm"
					variant="light"
					leftSection={<Plus size={14} />}
					onClick={() => addField("string")}
				>
					Add Field
				</Button>
			</Box>
		</Stack>
	);
}
