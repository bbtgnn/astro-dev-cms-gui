<script lang="ts">
	import { AuthoringApp, authoringPropsFromDefineCms } from "@cms/authoring";
	import { cmsConfig } from "$lib/cms";
	import catalog from "$lib/cms-components";

	const authoring = authoringPropsFromDefineCms(cmsConfig, catalog);
</script>

<div class="cms-shell">
	<AuthoringApp {...authoring} />
</div>

<style>
	.cms-shell {
		min-height: 100vh;
	}
</style>
