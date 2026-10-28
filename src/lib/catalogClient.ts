import { isCatalogItem, type CatalogItem } from "~/lib/catalog";

let pending: Promise<CatalogItem[]> | undefined;

export const loadCatalog = (): Promise<CatalogItem[]> => {
	// Share concurrent requests; the browser and Netlify cache successful public responses for 60 seconds.
	if (pending) return pending;
	pending = (async () => {
		const response = await fetch("/api/key-catalog.json", {
			credentials: "omit",
			signal: AbortSignal.timeout(15_000),
		});
		const result = await response.json();
		if (!response.ok || result?.ok !== true || !Array.isArray(result.items) || !result.items.every(isCatalogItem)) {
			throw new Error("The key catalog could not be loaded.");
		}
		return result.items;
	})().finally(() => { pending = undefined; });
	return pending;
};
