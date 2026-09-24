<!--
  Thin host mount: SSR form models + virtual catalog → AuthoringApp.
  Assembly lives in authoringPropsFromFormModels (ADR-0008 seam).
-->
<script lang="ts">
import components from "virtual:@cms/components";
import { mount } from "virtual:@cms/integration-options";
import {
	AuthoringApp,
	authoringPropsFromFormModels,
	type GetPreviewUrl,
} from "@cms/authoring";
import type { FormModelsByCollection } from "@cms/core/semantic";

let {
	formModels,
	getPreviewUrl = () => null,
}: {
	formModels: FormModelsByCollection;
	getPreviewUrl?: GetPreviewUrl;
} = $props();

const authoring = $derived(
	authoringPropsFromFormModels(formModels, components, {
		apiBase: mount,
		getPreviewUrl,
	}),
);
</script>

<AuthoringApp {...authoring} />
