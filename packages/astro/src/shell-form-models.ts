/**
 * Astro SSR seam: stamped CMS assemble → serializable form models for the
 * client shell (ADR-0008 — browser never imports content.config).
 */

import { forms } from "virtual:@cms/config";
import { collections } from "virtual:@cms/content-config";
import { contentRoot } from "virtual:@cms/integration-options";
import { memoryWriter } from "@cms/core";
import type { FormTree } from "@cms/core/form-tree";
import type { FormModelsByCollection } from "@cms/core/semantic";
import { assembleStampedCms } from "./assemble-stamped-cms";
import type { StampedCollectionConfig } from "./build-fs-host-from-stamped";

export { getPreviewUrl } from "virtual:@cms/config";

export function loadShellFormModels(): FormModelsByCollection {
	// Host field is discarded; memory Writer avoids FS side effects on SSR.
	const { formModels } = assembleStampedCms({
		collections: collections as Readonly<
			Record<string, StampedCollectionConfig>
		>,
		contentRoot,
		writer: memoryWriter(),
		fileExists: () => false,
		forms: forms as Readonly<Record<string, FormTree>>,
	});
	return formModels;
}
