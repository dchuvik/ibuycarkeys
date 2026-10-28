// Only the fields already visible in the public price list belong in the browser.
export type CatalogItem = {
	sku: string;
	make: string;
	description: string;
	keyType: string | null;
	price: number;
	lightScratchesPrice: number | null;
	wornPrice: number | null;
	imageUrl: string | null;
};

export type CatalogFilters = { search: string; make: string; keyType: string; sort: string };

export const isCatalogItem = (value: unknown): value is CatalogItem => {
	if (!value || typeof value !== "object") return false;
	const item = value as Record<string, unknown>;
	return ["sku", "make", "description"].every((key) => typeof item[key] === "string") &&
		typeof item.price === "number" && Number.isFinite(item.price) &&
		["lightScratchesPrice", "wornPrice"].every((key) => item[key] === null || (typeof item[key] === "number" && Number.isFinite(item[key]))) &&
		["keyType", "imageUrl"].every((key) => item[key] === null || typeof item[key] === "string");
};

export const filterCatalog = (items: readonly CatalogItem[], filters: CatalogFilters): CatalogItem[] => {
	const search = filters.search.trim().toLocaleLowerCase();
	const filtered = items.filter((item) =>
		(!filters.make || filters.make === "all" || item.make === filters.make) &&
		(!filters.keyType || filters.keyType === "all" || item.keyType === filters.keyType) &&
		(!search || `${item.sku} ${item.make} ${item.keyType ?? ""} ${item.description}`.toLocaleLowerCase().includes(search)),
	);
	if (filters.sort === "price-asc") filtered.sort((a, b) => a.price - b.price);
	if (filters.sort === "price-desc") filtered.sort((a, b) => b.price - a.price);
	return filtered;
};
