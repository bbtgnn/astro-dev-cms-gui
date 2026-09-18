/**
 * Resolve a locale value from a field-local i18n map.
 * Order: requested → fallbacks chain (cycle-guarded) → defaultLocale → undefined.
 * Does not materialize fallbacks into stored data.
 */
export type ResolveLocaleOptions = {
	defaultLocale: string;
	fallbacks?: Partial<Record<string, string>>;
};

export function resolveLocale<T>(
	value: Record<string, T> | null | undefined,
	locale: string,
	opts: ResolveLocaleOptions,
): T | undefined {
	if (value == null) return undefined;

	const seen = new Set<string>();
	let current: string | undefined = locale;

	while (current && !seen.has(current)) {
		seen.add(current);
		if (Object.hasOwn(value, current) && value[current] !== undefined) {
			return value[current];
		}
		current = opts.fallbacks?.[current];
	}

	const fallback = opts.defaultLocale;
	if (
		fallback &&
		!seen.has(fallback) &&
		Object.hasOwn(value, fallback) &&
		value[fallback] !== undefined
	) {
		return value[fallback];
	}

	return undefined;
}
