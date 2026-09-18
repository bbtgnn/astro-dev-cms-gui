<!--
  Thin host mount: wire protocol client + virtual:@cms/config into AuthoringApp.
  No schema discovery or serialization here — host Vite graph supplies config.
-->
<script lang="ts">
import { collections, getPreviewUrl } from "virtual:@cms/config";
import { AuthoringApp } from "@cms/authoring";
import { createFetchClient } from "@cms/crud/fetch-client";

const client = createFetchClient("/_cms");
</script>

<AuthoringApp {client} {collections} {getPreviewUrl} />
