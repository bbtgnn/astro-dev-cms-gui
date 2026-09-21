<!--
  Thin host mount: wire protocol client + virtual:@cms/config into AuthoringApp.
  Catalog keys from the IR resolve through virtual:@cms/components.
-->
<script lang="ts">
import components from "virtual:@cms/components";
import { getPreviewUrl, collections as semanticCollections } from "virtual:@cms/config";
import { mount } from "virtual:@cms/integration-options";
import {
	AuthoringApp,
	editorCollectionsFromFormModels,
	resolveCatalogBinding,
} from "@cms/authoring";
import { createFetchClient } from "@cms/core/fetch-client";
import {
	compileSemanticIr,
	projectFormModels,
} from "@cms/core/semantic";

const ir = compileSemanticIr({ collections: semanticCollections });
const formModels = projectFormModels(ir);
const collections = editorCollectionsFromFormModels(formModels, {
	resolveBinding: resolveCatalogBinding(components),
});

const client = createFetchClient(mount);
</script>

<AuthoringApp {client} {collections} {getPreviewUrl} />
