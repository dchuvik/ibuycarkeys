import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const item = (index, extra = {}) => ({
	sku: `KEY-${index}`, make: index % 2 ? "Toyota" : "Ford", description: `Key ${index} FCC ID ABC${index}`,
	keyType: "smart", price: index, lightScratchesPrice: null, wornPrice: null, imageUrl: null, ...extra,
});

const loadEndpoint = async ({ items = [item(1, { active: true })], fails = false } = {}) => {
	let reads = 0;
	const { GET } = await loadModule("src/pages/api/key-catalog.json.ts", { mocks: {
		"~/data/priceCatalog": { getPriceCatalog: async (options) => {
			assert.equal(options.fallbackOnError, false);
			reads++;
			if (fails) throw new Error("Internal database credentials and private details");
			return items;
		} },
	} });
	return { GET, reads: () => reads };
};
const context = (etag) => ({ request: new Request("https://ibuycarkeys.com/api/key-catalog.json", { headers: etag ? { "If-None-Match": etag } : {} }) });

test("the public catalog reads once and returns only active, explicitly public fields", async () => {
	const { GET, reads } = await loadEndpoint({ items: [
		item(1, { active: true, inventory_count: 500, private_note: "private", user_id: "owner" }),
		item(2, { active: false }),
	] });
	const response = await GET(context());
	assert.equal(response.status, 200);
	assert.deepEqual(await response.json(), { ok: true, items: [item(1)] });
	assert.equal(reads(), 1);
	assert.equal(response.headers.get("Cache-Control"), "public, max-age=60");
	assert.equal(response.headers.get("Netlify-CDN-Cache-Control"), "public, max-age=60");
	assert.equal(response.headers.has("Set-Cookie"), false);
});

test("catalog etags support conditional responses and change with public prices", async () => {
	const { GET } = await loadEndpoint();
	const response = await GET(context());
	const etag = response.headers.get("ETag");
	assert.ok(etag);
	for (const value of [etag, `W/${etag}`, `"other", ${etag}`]) {
		const unchanged = await GET(context(value));
		assert.equal(unchanged.status, 304);
		assert.equal(await unchanged.text(), "");
	}
	const changed = await loadEndpoint({ items: [item(1, { active: true, price: 100 })] });
	assert.notEqual((await changed.GET(context(etag))).headers.get("ETag"), etag);
});

test("an unavailable catalog returns a retryable, uncached error without fallback prices or internals", async () => {
	const { GET } = await loadEndpoint({ fails: true });
	const response = await GET(context());
	assert.equal(response.status, 503);
	assert.equal(response.headers.get("Cache-Control"), "no-store");
	assert.equal((await response.json()).ok, false);
});

test("search and combined filters find keys anywhere in all 539 items", async () => {
	const { filterCatalog } = await loadModule("src/lib/catalog.ts");
	const items = Array.from({ length: 539 }, (_, i) => item(i));
	const filters = { search: "abc538", make: "all", keyType: "all", sort: "price-desc" };
	assert.deepEqual(filterCatalog(items, filters).map((entry) => entry.sku), ["KEY-538"]);
	assert.equal(filterCatalog(items, { ...filters, make: "Toyota" }).length, 0);
	assert.equal(filterCatalog(items, { ...filters, make: "Ford", keyType: "smart" }).length, 1);
	assert.equal(filterCatalog(items, { ...filters, search: "  KEY-0  " })[0].price, 0);
	assert.equal(items[0].sku, "KEY-0", "Filtering never changes the source order");
});

test("sorting applies to the full catalog before taking a visible batch", async () => {
	const { filterCatalog } = await loadModule("src/lib/catalog.ts");
	const items = [item(10), item(0), item(99)];
	const filters = { search: "", make: "all", keyType: "all" };
	assert.deepEqual(filterCatalog(items, { ...filters, sort: "price-desc" }).map((entry) => entry.price), [99, 10, 0]);
	assert.deepEqual(filterCatalog(items, { ...filters, sort: "price-asc" }).map((entry) => entry.price), [0, 10, 99]);
	assert.deepEqual(filterCatalog(items, { ...filters, sort: "featured" }).map((entry) => entry.price), [10, 0, 99]);
});

test("concurrent catalog consumers share one public request without account credentials", async () => {
	let finish, requests = 0;
	const { loadCatalog } = await loadModule("src/lib/catalogClient.ts", { fetch: async (url, options) => {
		requests++;
		assert.equal(url, "/api/key-catalog.json");
		assert.equal(options.credentials, "omit");
		await new Promise((resolve) => { finish = resolve; });
		return new Response(JSON.stringify({ ok: true, items: [item(1)] }));
	} });
	const first = loadCatalog();
	assert.equal(first, loadCatalog());
	assert.equal(requests, 1);
	finish();
	assert.equal((await first)[0].sku, "KEY-1");
});

test("failed and malformed catalog requests can be retried and never become a cached success", async () => {
	let requests = 0;
	const { loadCatalog } = await loadModule("src/lib/catalogClient.ts", { fetch: async () => {
		requests++;
		const result = requests === 1 ? { ok: false } : requests === 2 ? { ok: true, items: [{ ...item(1), price: "100" }] } : { ok: true, items: [item(1)] };
		return new Response(JSON.stringify(result), { status: requests === 1 ? 503 : 200 });
	} });
	await assert.rejects(loadCatalog());
	await assert.rejects(loadCatalog());
	assert.equal((await loadCatalog()).length, 1);
	assert.equal(requests, 3);
});

test("strict database loading does not silently replace failed live prices with the sample catalog", async () => {
	for (const configured of [true, false]) {
		const client = { from: () => ({ select: () => ({ eq: () => ({ order: () => ({ order: async () => ({ data: null, error: {} }) }) }) }) }) };
		const { getPriceCatalog } = await loadModule("src/data/priceCatalog.ts", { mocks: {
			"~/lib/supabaseAdmin": { isSupabaseAdminConfigured: () => configured, getSupabaseAdmin: () => client },
		} });
		await assert.rejects(getPriceCatalog({ fallbackOnError: false }));
		assert.ok((await getPriceCatalog()).length > 0, "Existing pages retain their explicit fallback behavior");
	}
});
