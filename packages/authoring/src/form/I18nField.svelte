<!--
  Custom sjsf objectField: locale switcher + active locale editor only.
  Value shape stays `{ en: …, it: … }`; inactive locales remain in form state.
-->
<script lang="ts">
	import {
		type ComponentProps,
		getComponent,
		getFormContext,
		retrieveTranslate,
		retrieveUiOption,
	} from "@sjsf/form";
	import {
		createObjectContext,
		setObjectContext,
	} from "@sjsf/form/fields/object/context.svelte";

	const ctx = getFormContext();

	let {
		config,
		value = $bindable(),
		uiOption,
		translate,
	}: ComponentProps["objectField"] = $props();

	const objCtx = createObjectContext({
		ctx,
		config: () => config,
		value: () => value,
		setValue: (v) => (value = v),
		get translate() {
			return translate;
		},
	});
	setObjectContext(objCtx);

	const ObjectProperty = $derived(
		getComponent(ctx, "objectPropertyField", config),
	);
	const Template = $derived(getComponent(ctx, "objectTemplate", config));

	function uiOptions(): Record<string, unknown> {
		return (config.uiSchema?.["ui:options"] ?? {}) as Record<string, unknown>;
	}

	function readLocales(): string[] {
		const fromUi = uiOptions().locales;
		if (Array.isArray(fromUi) && fromUi.length > 0) {
			return fromUi.filter((l): l is string => typeof l === "string");
		}
		return objCtx.propertiesOrder();
	}

	function readDefaultLocale(list: string[]): string {
		const fromUi = uiOptions().defaultLocale;
		if (typeof fromUi === "string" && fromUi.length > 0) {
			return fromUi;
		}
		return list[0] ?? "";
	}

	const locales = $derived(readLocales());
	let activeLocale = $state(readDefaultLocale(readLocales()));
</script>

<Template
	type="template"
	{value}
	{config}
	{uiOption}
	errors={objCtx.errors()}
>
	{#if locales.length > 0}
		<label class="cms-i18n-locale">
			<span class="sjsf-label">Locale</span>
			<select class="sjsf-select" bind:value={activeLocale}>
				{#each locales as locale (locale)}
					<option value={locale}>{locale}</option>
				{/each}
			</select>
		</label>
	{/if}
	{#if activeLocale}
		{#key activeLocale}
			{@const property = activeLocale}
			{@const isAdditional = objCtx.isAdditionalProperty(property)}
			{@const cfg = objCtx.propertyConfig(config, property, isAdditional)}
			<ObjectProperty
				type="field"
				{property}
				{isAdditional}
				bind:value={() => value?.[property], (v) => objCtx.set(property, v)}
				config={cfg}
				uiOption={(opt) => retrieveUiOption(ctx, cfg, opt)}
				translate={retrieveTranslate(ctx, cfg)}
			/>
		{/key}
	{/if}
</Template>

<style>
	.cms-i18n-locale {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		margin-bottom: 0.5rem;
	}
</style>
