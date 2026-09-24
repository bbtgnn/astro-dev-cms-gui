<script lang="ts">
	import { AuthoringApp, authoringPropsFromDefineCms } from "@cms/authoring";
	import catalog from "$lib/cms-components";
	import { cmsConfig } from "$lib/cms";

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
