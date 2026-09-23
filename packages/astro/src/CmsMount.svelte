<!--
  Thin host mount: wire protocol client + SSR form models into AuthoringApp.
  Catalog keys from form-tree editor bindings resolve through virtual:@cms/components.
-->
<script lang="ts">
import components from "virtual:@cms/components";
import { mount } from "virtual:@cms/integration-options";
import {
	AuthoringApp,
	editorCollectionsFromFormModels,
	type GetPreviewUrl,
	resolveCatalogBinding,
} from "@cms/authoring";
import { createFetchClient } from "@cms/core/fetch-client";
import type { FormModelsByCollection } from "@cms/core/semantic";

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
