<!--
  Thin host mount: wire protocol client + virtual:@cms/config into AuthoringApp.
  No schema discovery or serialization here — host Vite graph supplies config.
-->
<script lang="ts">
import { collections, getPreviewUrl } from "virtual:@cms/config";
import { mount } from "virtual:@cms/integration-options";
import { AuthoringApp } from "@cms/authoring";
import { createFetchClient } from "@cms/core/fetch-client";

const client = createFetchClient(mount);
</script>

<AuthoringApp {client} {collections} {getPreviewUrl} />
