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
	editorCollectionsFromTree,
} from "@cms/authoring";
import { createFetchClient } from "@cms/core/fetch-client";

const collections = editorCollectionsFromTree(semanticCollections, components);

const client = createFetchClient(mount);
</script>

<AuthoringApp {client} {collections} {getPreviewUrl} />
