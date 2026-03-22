/**
 * Inline editor for a single {@link FieldDefinition}.
 *
 * Rendered inside each accordion panel of the {@link SchemaBuilder}.
 * Provides controls for title, type, required flag, select options,
 * and type-specific settings (long text, default-now).
 *
 * @module
 */

import {
	ActionIcon,
	Button,
	Group,
	Select,
	Stack,
	Switch,
	TextInput,
} from "@mantine/core";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import type { FieldDefinition, FieldType } from "../types";

import { SelectOptionsEditor } from "./SelectOptionsEditor";

/** Human-readable labels for each field type, shown in the type selector. */
const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
	{ value: "string", label: "Text" },
	{ value: "integer", label: "Integer" },
	{ value: "number", label: "Number" },
	{ value: "boolean", label: "Boolean" },
	{ value: "date", label: "Date" },
	{ value: "datetime", label: "Date & Time" },
	{ value: "time", label: "Time" },
	{ value: "select", label: "Select" },
	{ value: "multiselect", label: "Multi-Select" },
];

interface FieldEditorProps {
	/** The field being edited. */
	field: FieldDefinition;
	/** Called with partial updates when any property changes. */
	onChange: (updates: Partial<FieldDefinition>) => void;
	/** Called when the user clicks the remove button. */
	onRemove: () => void;
	/** Called when the user clicks the move-up arrow. Omit to hide the button. */
	onMoveUp?: () => void;
	/** Called when the user clicks the move-down arrow. Omit to hide the button. */
	onMoveDown?: () => void;
}

/**
 * Inline editor panel for a single field.
 *
 * - Changing the title auto-generates a slug for the field name.
 * - Select/multiselect types show a {@link SelectOptionsEditor}.
 * - Date/time types show a "Default to now" toggle.
 * - String types show a "Long text" toggle.
 */
export function FieldEditor({
	field,
	onChange,
	onRemove,
	onMoveUp,
	onMoveDown,
}: FieldEditorProps) {
	const showOptions = field.type === "select" || field.type === "multiselect";
	const showDefaultNow =
		field.type === "datetime" || field.type === "date" || field.type === "time";

	return (
		<Stack gap="sm">
			<Group grow>
				<TextInput
					label="Title"
					value={field.title}
					onChange={(e) => {
						const title = e.currentTarget.value;
						const name = title
							.toLowerCase()
							.replace(/[^a-z0-9]+/g, "_")
							.replace(/^_|_$/g, "");
						onChange({ title, name });
					}}
				/>
				<Select
					label="Type"
					data={FIELD_TYPE_OPTIONS}
					value={field.type}
					onChange={(val) => {
						if (val) onChange({ type: val as FieldType });
					}}
				/>
			</Group>

			<Group>
				<Switch
					label="Required"
					checked={field.required}
					onChange={(e) => onChange({ required: e.currentTarget.checked })}
				/>
				{field.type === "string" && (
					<Switch
						label="Long text"
						checked={field.longText ?? false}
						onChange={(e) => onChange({ longText: e.currentTarget.checked })}
					/>
				)}
				{showDefaultNow && (
					<Switch
						label="Default to now"
						checked={field.defaultNow ?? false}
						onChange={(e) => onChange({ defaultNow: e.currentTarget.checked })}
					/>
				)}
			</Group>

			{showOptions && (
				<SelectOptionsEditor
					options={field.options ?? []}
					onChange={(options) => onChange({ options })}
				/>
			)}

			<Group justify="space-between">
				<Group gap="xs">
					{onMoveUp && (
						<ActionIcon size="sm" variant="subtle" onClick={onMoveUp}>
							<ArrowUp size={14} />
						</ActionIcon>
					)}
					{onMoveDown && (
						<ActionIcon size="sm" variant="subtle" onClick={onMoveDown}>
							<ArrowDown size={14} />
						</ActionIcon>
					)}
				</Group>
				<Button
					size="xs"
					variant="subtle"
					color="red"
					leftSection={<Trash2 size={14} />}
					onClick={onRemove}
				>
					Remove
				</Button>
			</Group>
		</Stack>
	);
}
