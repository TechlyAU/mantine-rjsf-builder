/**
 * Inline editor for the options of a select or multiselect field.
 *
 * Each option is a value/label pair. Users can add, edit, and remove options.
 *
 * @module
 */

import { ActionIcon, Button, Group, Stack, TextInput } from "@mantine/core";
import { Plus, Trash2 } from "lucide-react";

import type { SelectOption } from "../types";

interface SelectOptionsEditorProps {
	/** The current list of options. */
	options: SelectOption[];
	/** Called with the updated list whenever an option is added, edited, or removed. */
	onChange: (options: SelectOption[]) => void;
}

/**
 * Editable list of value/label pairs for select and multiselect fields.
 */
export function SelectOptionsEditor({
	options,
	onChange,
}: SelectOptionsEditorProps) {
	const addOption = () => {
		onChange([...options, { value: "", label: "" }]);
	};

	const updateOption = (index: number, updates: Partial<SelectOption>) => {
		const updated = options.map((opt, i) =>
			i === index ? { ...opt, ...updates } : opt,
		);
		onChange(updated);
	};

	const removeOption = (index: number) => {
		onChange(options.filter((_, i) => i !== index));
	};

	return (
		<Stack gap="xs">
			{options.map((opt, idx) => (
				<Group key={`option-${idx}`} gap="xs">
					<TextInput
						placeholder="Value"
						size="xs"
						style={{ flex: 1 }}
						value={opt.value}
						onChange={(e) =>
							updateOption(idx, {
								value: e.currentTarget.value,
							})
						}
					/>
					<TextInput
						placeholder="Label"
						size="xs"
						style={{ flex: 1 }}
						value={opt.label}
						onChange={(e) =>
							updateOption(idx, {
								label: e.currentTarget.value,
							})
						}
					/>
					<ActionIcon
						size="xs"
						variant="subtle"
						color="red"
						onClick={() => removeOption(idx)}
					>
						<Trash2 size={12} />
					</ActionIcon>
				</Group>
			))}
			<Button
				size="xs"
				variant="subtle"
				leftSection={<Plus size={12} />}
				onClick={addOption}
			>
				Add Option
			</Button>
		</Stack>
	);
}
