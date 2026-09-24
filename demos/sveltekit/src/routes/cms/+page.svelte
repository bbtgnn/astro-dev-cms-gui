<script lang="ts">
	import {
		AuthoringApp,
		editorCollectionsFromSchemas,
	} from "@cms/authoring";
	import { createFetchClient } from "@cms/core/fetch-client";
	import type { FormTree } from "@cms/core/form-tree";
	import { cmsConfig } from "$lib/cms";
	import catalog from "$lib/cms-components";

	const forms = Object.fromEntries(
		Object.entries(cmsConfig.forms).filter(
			(entry): entry is [string, FormTree] => entry[1] != null,
		),
	);

	const collections = editorCollectionsFromSchemas(
		cmsConfig.schemas,
		catalog,
		{ forms },
	);

	const client = createFetchClient();
	const getPreviewUrl = cmsConfig.getPreviewUrl;
</script>

<div class="cms-shell">
	<AuthoringApp {client} {collections} {getPreviewUrl} />
</div>

<style>
	.cms-shell {
		min-height: 100vh;
	}
</style>
