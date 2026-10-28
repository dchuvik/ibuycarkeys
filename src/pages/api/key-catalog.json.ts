import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import { getPriceCatalog } from "~/data/priceCatalog";
import type { CatalogItem } from "~/lib/catalog";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
	try {
		const catalog = await getPriceCatalog({ fallbackOnError: false });
		const items: CatalogItem[] = catalog.filter((item) => item.active).map((item) => ({
			sku: item.sku,
			make: item.make,
			description: item.description,
			keyType: item.keyType,
			price: item.price,
			lightScratchesPrice: item.lightScratchesPrice,
			wornPrice: item.wornPrice,
			imageUrl: item.imageUrl,
		}));
		const body = JSON.stringify({ ok: true, items });
		const etag = `"${createHash("sha256").update(body).digest("hex")}"`;
		// This response is identical for every visitor and contains no account or inventory data.
		const headers = {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "public, max-age=60",
			"Netlify-CDN-Cache-Control": "public, max-age=60",
			ETag: etag,
		};
		const matches = request.headers.get("if-none-match")?.split(",").some((value) => value.trim().replace(/^W\//, "") === etag || value.trim() === "*");
		return new Response(matches ? null : body, { status: matches ? 304 : 200, headers });
	} catch {
		return new Response(JSON.stringify({ ok: false, error: "The key catalog could not be loaded. Please try again." }), {
			status: 503,
			headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Retry-After": "30" },
		});
	}
};
