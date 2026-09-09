<!--
  Custom sjsf arrayField: polymorphic blocks list.
  Value shape: `{ type: string; content: T }[]`.
  Add (pick type) / remove / reorder + nested FieldUi editor for `content`.
-->
<script lang="ts">
	import type {
		ComponentProps,
		Schema,
		SchemaValue,
	} from "@sjsf/form";
	import {
		createKeyedArrayDeriver,
		getChildPath,
		getComponent,
		getFieldComponent,
		getFormContext,
		getStableConfig,
		retrieveSchema,
		retrieveTranslate,
		retrieveUiOption,
		retrieveUiSchema,
		Text,
		uiTitleOption,
	} from "@sjsf/form";
	import {
		createArrayContext,
		setArrayContext,
	} from "@sjsf/form/fields/array/context.svelte";
	import { VirtualKeyedArray } from "@sjsf/form/fields/array/virtual-keyed-array";
	import { SimpleKeyedArray } from "@sjsf/form/lib/keyed-array.svelte";

	const ctx = getFormContext();

	let {
		config,
		value = $bindable(),
		uiOption,
		translate,
	}: ComponentProps["arrayField"] = $props();

	const arrayCtx = createArrayContext({
		ctx,
		config: () => config,
		value: () => value,
		setValue: (v) => (value = v),
		keyedArray: createKeyedArrayDeriver(
			ctx,
			() => value,
			() => new VirtualKeyedArray((v) => (value = v)),
			(v, g) => new SimpleKeyedArray(v, g),
		),
	});
	setArrayContext(arrayCtx);

	const Template = $derived(getComponent(ctx, "arrayTemplate", config));
	const Button = $derived(getComponent(ctx, "button", config));

	function uiOptions(): Record<string, unknown> {
		return (config.uiSchema?.["ui:options"] ?? {}) as Record<string, unknown>;
	}

	function readBlockTypes(): string[] {
		const fromUi = uiOptions().blockTypes;
		if (Array.isArray(fromUi) && fromUi.length > 0) {
			return fromUi.filter((t): t is string => typeof t === "string");
		}
		return [];
	}

	function readBlockLabels(): Record<string, string> {
		const fromUi = uiOptions().blockLabels;
		if (fromUi && typeof fromUi === "object" && !Array.isArray(fromUi)) {
			const out: Record<string, string> = {};
			for (const [k, v] of Object.entries(fromUi as Record<string, unknown>)) {
				if (typeof v === "string") out[k] = v;
			}
			return out;
		}
		return {};
	}

	const blockTypes = $derived(readBlockTypes());
	const blockLabels = $derived(readBlockLabels());
	let selectedType = $state("");

	const effectiveSelected = $derived(
		selectedType && blockTypes.includes(selectedType)
			? selectedType
			: (blockTypes[0] ?? ""),
	);

	function labelFor(type: string): string {
		return blockLabels[type] ?? type;
	}

	function itemType(item: unknown): string {
		if (item && typeof item === "object" && "type" in item) {
			const t = (item as { type: unknown }).type;
			if (typeof t === "string") return t;
		}
		return "";
	}

	function itemContent(item: unknown): SchemaValue | undefined {
		if (item && typeof item === "object" && "content" in item) {
			return (item as { content: SchemaValue | undefined }).content;
		}
		return undefined;
	}

	function pickBranchUiSchema(itemUi: Record<string, unknown>, type: string) {
		const oneOf = itemUi.oneOf;
		if (Array.isArray(oneOf) && type) {
			const idx = blockTypes.indexOf(type);
			const branch = idx >= 0 ? oneOf[idx] : undefined;
			if (branch && typeof branch === "object") {
				return branch as Record<string, unknown>;
			}
		}
		return itemUi;
	}

	/** Match `oneOf`/`anyOf` item schemas to `blockTypes` index (same as uiSchema). */
	function pickBranchSchema(
		itemSchema: Record<string, unknown>,
		type: string,
	): Record<string, unknown> {
		const branches = itemSchema.oneOf ?? itemSchema.anyOf;
		if (Array.isArray(branches) && type) {
			const idx = blockTypes.indexOf(type);
			const branch = idx >= 0 ? branches[idx] : undefined;
			if (branch && typeof branch === "object" && !Array.isArray(branch)) {
				return branch as Record<string, unknown>;
			}
		}
		return itemSchema;
	}

	function contentConfig(index: number, item: unknown) {
		const itemCfg = arrayCtx.itemConfig(config, item as never, index);
		const type = itemType(item);
		const branchSchema = pickBranchSchema(
			itemCfg.schema as Record<string, unknown>,
			type,
		) as Schema & {
			properties?: Record<string, Schema | boolean>;
			required?: string[];
		};
		const contentDef = branchSchema.properties?.content;
		const contentSchema: Schema =
			contentDef && typeof contentDef === "object" ? contentDef : {};

		const branchUi = pickBranchUiSchema(
			itemCfg.uiSchema as Record<string, unknown>,
			type,
		);
		const contentUi = retrieveUiSchema(ctx, branchUi.content as never);

		return getStableConfig(ctx, {
			path: getChildPath(ctx, itemCfg.path, "content"),
			title: uiTitleOption(ctx, contentUi) ?? "Content",
			schema: retrieveSchema(ctx, contentSchema, itemContent(item)),
			uiSchema: contentUi,
			required: Array.isArray(branchSchema.required)
				? branchSchema.required.includes("content")
				: true,
			value: () => itemContent(item),
		});
	}

	function addBlock() {
		const type = effectiveSelected;
		if (!type || !arrayCtx.canAdd()) return;
		const next = [...(value ?? []), { type, content: {} }];
		value = next;
	}

	function setContent(index: number, content: SchemaValue | undefined) {
		const current = value?.[index];
		if (!current || typeof current !== "object") return;
		arrayCtx.set(index, {
			...(current as Record<string, SchemaValue | undefined>),
			content,
		} as SchemaValue);
	}
</script>

{#snippet addControls()}
	{#if arrayCtx.canAdd() && blockTypes.length > 0}
		<label class="cms-blocks-add">
			<span class="sjsf-label">Block type</span>
			<select
				class="sjsf-select"
				value={effectiveSelected}
				onchange={(e) => {
					selectedType = e.currentTarget.value;
				}}
			>
				{#each blockTypes as type (type)}
					<option value={type}>{labelFor(type)}</option>
				{/each}
			</select>
		</label>
		<Button
			errors={arrayCtx.errors()}
			{config}
			disabled={!effectiveSelected}
			type="array-item-add"
			onclick={addBlock}
		>
			<Text {config} id="add-array-item" {translate} />
		</Button>
	{/if}
{/snippet}

<Template
	type="template"
	errors={arrayCtx.errors()}
	{config}
	{value}
	{uiOption}
	addButton={arrayCtx.canAdd() ? addControls : undefined}
>
	{#each { length: arrayCtx.length() } as _, index (arrayCtx.key(index))}
		{@const item = value?.[index]}
		{@const type = itemType(item)}
		{@const cfg = contentConfig(index, item)}
		{@const Field = getFieldComponent(ctx, cfg)}
		{@const canMoveUp = arrayCtx.canMoveUp(index)}
		{@const canMoveDown = arrayCtx.canMoveDown(index)}
		{@const canRemove = arrayCtx.canRemove(index)}
		<div class="cms-blocks-item">
			<header class="cms-blocks-item-header">
				<strong class="cms-blocks-item-type">{labelFor(type) || "Block"}</strong>
				<div class="cms-blocks-item-actions">
					{#if arrayCtx.orderable()}
						<Button
							errors={arrayCtx.errors()}
							{config}
							type="array-item-move-up"
							disabled={!canMoveUp}
							onclick={() => arrayCtx.moveItemUp(index)}
						>
							<Text {config} id="move-array-item-up" {translate} />
						</Button>
						<Button
							errors={arrayCtx.errors()}
							{config}
							type="array-item-move-down"
							disabled={!canMoveDown}
							onclick={() => arrayCtx.moveItemDown(index)}
						>
							<Text {config} id="move-array-item-down" {translate} />
						</Button>
					{/if}
					{#if canRemove}
						<Button
							errors={arrayCtx.errors()}
							{config}
							type="array-item-remove"
							disabled={false}
							onclick={() => arrayCtx.removeItem(index)}
						>
							<Text {config} id="remove-array-item" {translate} />
						</Button>
					{/if}
				</div>
			</header>
			<Field
				type="field"
				bind:value={
					() => itemContent(item) as undefined,
					(v) => setContent(index, v as SchemaValue | undefined)
				}
				config={cfg}
				uiOption={(opt) => retrieveUiOption(ctx, cfg, opt)}
				translate={retrieveTranslate(ctx, cfg)}
			/>
		</div>
	{/each}
</Template>

<style>
	.cms-blocks-add {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		margin-bottom: 0.5rem;
	}

	.cms-blocks-item {
		margin-bottom: 0.75rem;
	}

	.cms-blocks-item-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.35rem;
	}

	.cms-blocks-item-type {
		font-weight: 600;
	}

	.cms-blocks-item-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}
</style>
