/**
 * PROTOTYPE / SPIKE — refuse write API outside DEV unless overridden.
 */
export function cmsDevOnlyGuard(opts: {
	isDev: boolean;
	allowInProd?: boolean;
}): Response | null {
	if (opts.isDev || opts.allowInProd) return null;
	return Response.json(
		{ error: "CMS write-back is dev-only by default" },
		{ status: 403 },
	);
}
