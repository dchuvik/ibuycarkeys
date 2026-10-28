import { filterCatalog, type CatalogItem } from "~/lib/catalog";
import { loadCatalog } from "~/lib/catalogClient";
import { showToast } from "~/lib/toast";

const batchSize = 30;
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const mountPriceCatalog = (section: HTMLElement) => {
	const search = section.querySelector<HTMLInputElement>("#catalog-search")!;
	const make = section.querySelector<HTMLSelectElement>("#catalog-make")!;
	const keyType = section.querySelector<HTMLSelectElement>("#catalog-key-type")!;
	const sort = section.querySelector<HTMLSelectElement>("#catalog-sort")!;
	const scroll = section.querySelector<HTMLElement>("#catalog-scroll")!;
	const grid = section.querySelector<HTMLElement>("#catalog-card-grid")!;
	const template = section.querySelector<HTMLTemplateElement>("#catalog-card-template")!;
	const loading = section.querySelector<HTMLElement>("#catalog-loading")!;
	const error = section.querySelector<HTMLElement>("#catalog-error")!;
	const empty = section.querySelector<HTMLElement>("#catalog-empty")!;
	const retry = section.querySelector<HTMLButtonElement>("#catalog-retry")!;
	const status = section.querySelector<HTMLElement>("#catalog-status")!;
	const sentinel = section.querySelector<HTMLElement>("#catalog-sentinel")!;
	const resultsCount = document.getElementById("catalog-results-count");
	const lifecycle = new AbortController();
	let disposed = false;
	let items: CatalogItem[] = [];
	let matching: CatalogItem[] = [];
	let itemBySku = new Map<string, CatalogItem>();
	let rendered = 0;
	let selected: { sku: string; condition: string } | undefined;
	let fetching = false;
	let searchTimer = 0;
	let initialFrame = 0;
	let initialTimer = 0;
	let moreFrame = 0;
	let observer: IntersectionObserver | undefined;
	const active = () => !disposed && section.isConnected;
	const controls = [search, make, keyType, sort];

	const setSelected = (button: HTMLButtonElement, isActive: boolean) => {
		button.setAttribute("aria-pressed", String(isActive));
		for (const name of ["border-gray-900", "bg-gray-900", "text-white", "shadow-sm"]) button.classList.toggle(name, isActive);
		button.querySelectorAll("span").forEach((label) => {
			label.classList.toggle("text-white", isActive);
			label.classList.toggle("text-gray-500", !isActive && !label.hasAttribute("data-catalog-price"));
			label.classList.toggle("text-gray-900", !isActive && label.hasAttribute("data-catalog-price"));
		});
	};

	const createCard = (item: CatalogItem) => {
		const card = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
		card.dataset.sku = item.sku;
		card.dataset.price = String(item.price);
		card.querySelector<HTMLElement>("[data-catalog-make]")!.textContent = item.make;
		card.querySelector<HTMLElement>("[data-catalog-sku]")!.textContent = item.sku;
		card.querySelector<HTMLElement>("[data-catalog-description]")!.textContent = item.description;
		const image = card.querySelector<HTMLImageElement>("img")!;
		if (item.imageUrl) {
			try {
				const url = new URL(item.imageUrl, location.origin);
				if (url.protocol === "https:" || url.protocol === "http:") image.src = url.href;
			} catch { /* Leave the existing placeholder when an image URL is invalid. */ }
		}
		image.alt = `${item.make} ${item.sku} key`;
		image.loading = "lazy";
		image.decoding = "async";
		image.width = 320;
		image.height = 240;
		card.querySelector<HTMLElement>(".absolute.bottom-2")!.textContent = item.keyType || "Key";
		card.querySelectorAll<HTMLButtonElement>("[data-select-condition]").forEach((button) => {
			const condition = button.dataset.selectCondition;
			button.dataset.selectSku = item.sku;
			const price = condition === "light-scratches" ? item.lightScratchesPrice ?? item.price : condition === "worn" ? item.wornPrice ?? item.price : item.price;
			button.querySelector<HTMLElement>("[data-catalog-price]")!.textContent = currency.format(price);
			setSelected(button, selected?.sku === item.sku && selected.condition === condition);
		});
		return card;
	};

	const appendBatch = () => {
		if (!active() || rendered >= matching.length) return;
		const batch = document.createDocumentFragment();
		const end = Math.min(rendered + batchSize, matching.length);
		for (; rendered < end; rendered++) batch.append(createCard(matching[rendered]));
		grid.append(batch);
		const more = rendered < matching.length;
		sentinel.classList.toggle("hidden", !more);
		sentinel.textContent = more ? `Showing ${rendered} of ${matching.length} keys. More appear as you scroll.` : "";
	};

	const applyFilters = () => {
		if (!active()) return;
		observer?.disconnect();
		matching = filterCatalog(items, { search: search.value, make: make.value, keyType: keyType.value, sort: sort.value });
		rendered = 0;
		grid.replaceChildren();
		scroll.scrollTop = 0;
		empty.classList.toggle("hidden", matching.length > 0);
		empty.textContent = items.length ? "No keys match your filters. Try a different make, key type, or search." : "There are no keys listed right now. Please check back soon.";
		sentinel.classList.add("hidden");
		appendBatch();
		if (rendered < matching.length) observer?.observe(sentinel);
		const hasFilters = search.value.trim() || make.value !== "all" || keyType.value !== "all";
		if (resultsCount) resultsCount.textContent = `${matching.length} ${hasFilters ? "matching " : ""}catalog item${matching.length === 1 ? "" : "s"}${make.value === "all" ? " across all makes" : ""}`;
		status.textContent = matching.length ? "Choose a key below. Search and filters include the entire catalog." : empty.textContent;
	};

	const fillOptions = (field: HTMLSelectElement, values: string[], first: string) => {
		const fragment = document.createDocumentFragment();
		const all = document.createElement("option");
		all.value = "all";
		all.textContent = first;
		fragment.append(all);
		for (const value of values) {
			const option = document.createElement("option");
			option.value = value;
			option.textContent = value;
			fragment.append(option);
		}
		field.replaceChildren(fragment);
	};

	const startLoading = async (isRetry = false) => {
		if (fetching || !active()) return;
		fetching = true;
		loading.classList.remove("hidden");
		error.classList.add("hidden");
		grid.setAttribute("aria-busy", "true");
		controls.forEach((control) => { control.disabled = true; });
		status.textContent = "Loading the key catalog...";
		if (resultsCount) resultsCount.textContent = "Loading keys...";
		if (isRetry) showToast("Loading the key catalog...", { id: "catalog-load", kind: "loading" });
		try {
			items = await loadCatalog();
			if (!active()) return;
			itemBySku = new Map(items.map((item) => [item.sku, item]));
			const makes = [...new Set(items.map((item) => item.make))].sort((a, b) => a.localeCompare(b));
			const types = [...new Set(items.map((item) => item.keyType).filter((type): type is string => Boolean(type)))].sort((a, b) => a.localeCompare(b));
			fillOptions(make, makes, "All makes");
			fillOptions(keyType, types, "All key types");
			const makeParam = new URL(location.href).searchParams.get("make");
			if (makeParam && makes.includes(makeParam)) make.value = makeParam;
			for (const [id, value] of [["catalog-total-makes", makes.length], ["catalog-total-keys", items.length]] as const) {
				const statistic = document.getElementById(id);
				if (statistic) { statistic.textContent = String(value); statistic.removeAttribute("aria-label"); }
			}
			loading.classList.add("hidden");
			controls.forEach((control) => { control.disabled = false; });
			applyFilters();
			if (isRetry) showToast("The key catalog is ready.", { id: "catalog-load" });
		} catch {
			if (!active()) return;
			loading.classList.add("hidden");
			error.classList.remove("hidden");
			status.textContent = "Keys could not be loaded. Please try again.";
			if (resultsCount) resultsCount.textContent = "Catalog unavailable";
			showToast("The key catalog could not be loaded. Use Try again in the catalog to retry.", { id: "catalog-load", kind: "error" });
		} finally {
			fetching = false;
			if (active()) grid.setAttribute("aria-busy", "false");
		}
	};

	if ("IntersectionObserver" in window) {
		observer = new IntersectionObserver((entries) => {
			if (entries.some((entry) => entry.isIntersecting)) appendBatch();
		}, { root: scroll, rootMargin: "300px 0px" });
	}
	// Also supports browsers without IntersectionObserver and keyboard scrolling to the end.
	scroll.addEventListener("scroll", () => {
		if (moreFrame) return;
		moreFrame = requestAnimationFrame(() => {
			moreFrame = 0;
			if (scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 300) appendBatch();
		});
	}, { passive: true, signal: lifecycle.signal });
	grid.addEventListener("click", (event) => {
		const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-select-sku]") : null;
		if (!button || !grid.contains(button)) return;
		const item = itemBySku.get(button.dataset.selectSku ?? "");
		if (!item) return;
		selected = { sku: item.sku, condition: button.dataset.selectCondition ?? "excellent" };
		grid.querySelectorAll<HTMLButtonElement>("[data-select-sku]").forEach((entry) => setSelected(entry, entry === button));
		document.dispatchEvent(new CustomEvent("key-catalog-select", { detail: { ...selected, item } }));
	}, { signal: lifecycle.signal });
	search.addEventListener("input", () => {
		window.clearTimeout(searchTimer);
		searchTimer = window.setTimeout(applyFilters, 100);
	}, { signal: lifecycle.signal });
	for (const field of [make, keyType, sort]) field.addEventListener("change", applyFilters, { signal: lifecycle.signal });
	retry.addEventListener("click", () => { void startLoading(true); }, { signal: lifecycle.signal });

	// Yield a frame and task so the homepage can paint before requesting the full list.
	initialFrame = requestAnimationFrame(() => { initialTimer = window.setTimeout(() => { void startLoading(); }, 0); });
	return () => {
		disposed = true;
		lifecycle.abort();
		observer?.disconnect();
		window.clearTimeout(searchTimer);
		window.clearTimeout(initialTimer);
		cancelAnimationFrame(initialFrame);
		cancelAnimationFrame(moreFrame);
	};
};
