<!--
  Thin host mount: wire protocol client + SSR form models into AuthoringApp.
  Catalog keys from overlays resolve through virtual:@cms/components.
-->
<script lang="ts">
import components from "virtual:@cms/components";
import { mount } from "virtual:@cms/integration-options";
import {
	AuthoringApp,
	editorCollectionsFromFormModels,
	resolveCatalogBinding,
	type GetPreviewUrl,
} from "@cms/authoring";
import type { FormModelsByCollection } from "@cms/core/semantic";
import { createFetchClient } from "@cms/core/fetch-client";

let {
	formModels,
	getPreviewUrl = () => null,
}: {
	formModels: FormModelsByCollection;
	getPreviewUrl?: GetPreviewUrl;
} = $props();

const collections = $derived(
	editorCollectionsFromFormModels(formModels, {
		resolveBinding: resolveCatalogBinding(components),
	}),
);

const client = createFetchClient(mount);
</script>

<AuthoringApp {client} {collections} {getPreviewUrl} />
