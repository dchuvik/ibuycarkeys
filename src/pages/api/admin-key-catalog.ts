import type { APIRoute } from "astro";
import { adminSessionCookieName, isValidAdminSessionToken } from "~/lib/adminAuth";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "~/lib/supabaseAdmin";
import { defaultPriceCatalog } from "~/data/priceCatalog";

export const prerender = false;

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});

const isAuthorized = (cookieValue?: string) => isValidAdminSessionToken(cookieValue);

export const POST: APIRoute = async ({ cookies, request }) => {
	if (!isAuthorized(cookies.get(adminSessionCookieName)?.value)) {
		return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
	}

	if (!isSupabaseAdminConfigured()) {
		return jsonResponse({ ok: false, error: "Admin not configured" }, 500);
	}

	const supabaseAdmin = getSupabaseAdmin();
	let payload: Record<string, unknown> = {};

	try {
		payload = (await request.json()) as Record<string, unknown>;
	} catch {
		return jsonResponse({ ok: false, error: "Invalid request body" }, 400);
	}

	const action = String(payload.action ?? "update");

	if (action === "seed") {
		const rows = defaultPriceCatalog.map((item) => ({
			sku: item.sku,
			make: item.make,
			description: item.description,
			excellent_price: item.price,
			adjusted_price: item.wornPrice,
			light_scratches_price: item.lightScratchesPrice,
			worn_price: item.wornPrice,
			inventory_count: item.inventoryCount,
			max_order_quantity: item.maxOrderQuantity,
			active: item.active,
		}));

		const { error } = await supabaseAdmin.from("key_catalog_items").upsert(rows, { onConflict: "sku" });

		if (error) {
			return jsonResponse({ ok: false, error: "Could not seed key catalog" }, 500);
		}

		return jsonResponse({ ok: true, seeded: rows.length });
	}

	const sku = String(payload.sku ?? "").trim();
	if (!sku) {
		return jsonResponse({ ok: false, error: "Missing sku" }, 400);
	}

	const excellentPrice = Number(payload.excellentPrice ?? 0);
	const lightScratchesPriceValue = payload.lightScratchesPrice;
	const lightScratchesPrice =
		lightScratchesPriceValue === "" || lightScratchesPriceValue === null || lightScratchesPriceValue === undefined
			? null
			: Number(lightScratchesPriceValue);
	const wornPriceValue = payload.wornPrice;
	const wornPrice =
		wornPriceValue === "" || wornPriceValue === null || wornPriceValue === undefined ? null : Number(wornPriceValue);
	const inventoryCount = Number(payload.inventoryCount ?? 0);
	const maxOrderQuantity = Number(payload.maxOrderQuantity ?? 0);
	const active = Boolean(payload.active);

	if (
		Number.isNaN(excellentPrice) ||
		(lightScratchesPrice !== null && Number.isNaN(lightScratchesPrice)) ||
		(wornPrice !== null && Number.isNaN(wornPrice)) ||
		Number.isNaN(inventoryCount) ||
		Number.isNaN(maxOrderQuantity)
	) {
		return jsonResponse({ ok: false, error: "Invalid numeric values" }, 400);
	}

	const { data, error } = await supabaseAdmin
		.from("key_catalog_items")
		.update({
			excellent_price: excellentPrice,
			adjusted_price: wornPrice,
			light_scratches_price: lightScratchesPrice,
			worn_price: wornPrice,
			inventory_count: inventoryCount,
			max_order_quantity: maxOrderQuantity,
			active,
			updated_at: new Date().toISOString(),
		})
		.eq("sku", sku)
		.select("sku");

	if (error) {
		return jsonResponse({ ok: false, error: "Could not update key catalog item" }, 500);
	}

	if (!data?.length) {
		return jsonResponse({ ok: false, error: "Key catalog item not found" }, 404);
	}

	return jsonResponse({ ok: true, sku });
};
