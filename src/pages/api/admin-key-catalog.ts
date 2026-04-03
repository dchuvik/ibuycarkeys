import type { APIRoute } from "astro";
import slugify from "slugify";
import { adminSessionCookieName, isValidAdminSessionToken } from "~/lib/adminAuth";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "~/lib/supabaseAdmin";
import { defaultPriceCatalog } from "~/data/priceCatalog";

export const prerender = false;

const keyCatalogImageBucket = "key-catalog-images";

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});

const isAuthorized = (cookieValue?: string) => isValidAdminSessionToken(cookieValue);

const parseNullableNumber = (value: FormDataEntryValue | string | null | undefined) => {
	if (value === "" || value === null || value === undefined) {
		return null;
	}

	const parsed = Number(value);
	return Number.isNaN(parsed) ? Number.NaN : parsed;
};

const parseRequiredNumber = (value: FormDataEntryValue | string | null | undefined, fallback = 0) => {
	const parsed = Number(value ?? fallback);
	return Number.isNaN(parsed) ? Number.NaN : parsed;
};

const createImagePath = (sku: string, fileName: string) => {
	const safeSku = slugify(sku, { lower: true, strict: true }) || "key";
	const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() ?? "webp" : "webp";
	return `${safeSku}/${Date.now()}.${extension}`;
};

const uploadCatalogImage = async (file: File, sku: string) => {
	if (!(file instanceof File) || !file.size) {
		return null;
	}

	const supabaseAdmin = getSupabaseAdmin();
	const filePath = createImagePath(sku, file.name);
	const fileBytes = new Uint8Array(await file.arrayBuffer());
	const { error } = await supabaseAdmin.storage.from(keyCatalogImageBucket).upload(filePath, fileBytes, {
		contentType: file.type || "application/octet-stream",
		upsert: true,
	});

	if (error) {
		throw new Error("Could not upload key image");
	}

	const { data } = supabaseAdmin.storage.from(keyCatalogImageBucket).getPublicUrl(filePath);
	return data.publicUrl;
};

const parsePayload = async (request: Request) => {
	const contentType = request.headers.get("content-type") ?? "";

	if (contentType.includes("multipart/form-data")) {
		const formData = await request.formData();
		return {
			kind: "formData" as const,
			action: String(formData.get("action") ?? "update"),
			formData,
		};
	}

	const json = (await request.json()) as Record<string, unknown>;
	return {
		kind: "json" as const,
		action: String(json.action ?? "update"),
		json,
	};
};

export const POST: APIRoute = async ({ cookies, request }) => {
	if (!isAuthorized(cookies.get(adminSessionCookieName)?.value)) {
		return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
	}

	if (!isSupabaseAdminConfigured()) {
		return jsonResponse({ ok: false, error: "Admin not configured" }, 500);
	}

	const supabaseAdmin = getSupabaseAdmin();

	let parsedRequest: Awaited<ReturnType<typeof parsePayload>>;
	try {
		parsedRequest = await parsePayload(request);
	} catch {
		return jsonResponse({ ok: false, error: "Invalid request body" }, 400);
	}

	const action = parsedRequest.action;

	if (action === "seed") {
		const rows = defaultPriceCatalog.map((item) => ({
			sku: item.sku,
			make: item.make,
			description: item.description,
			excellent_price: item.price,
			adjusted_price: item.wornPrice,
			light_scratches_price: item.lightScratchesPrice,
			worn_price: item.wornPrice,
			image_url: item.imageUrl,
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

	const source = parsedRequest.kind === "formData" ? parsedRequest.formData : parsedRequest.json;
	const getValue = (key: string) =>
		source instanceof FormData ? source.get(key) : (source[key] as string | number | boolean | null | undefined);
	const sku = String(getValue("sku") ?? "").trim();
	const make = String(getValue("make") ?? "").trim();
	const description = String(getValue("description") ?? "").trim();
	const excellentPrice = parseRequiredNumber(getValue("excellentPrice"));
	const lightScratchesPrice = parseNullableNumber(getValue("lightScratchesPrice"));
	const wornPrice = parseNullableNumber(getValue("wornPrice"));
	const inventoryCount = parseRequiredNumber(getValue("inventoryCount"));
	const maxOrderQuantity = parseRequiredNumber(getValue("maxOrderQuantity"), 25);
	const activeValue = getValue("active");
	const active = activeValue === true || activeValue === "true" || activeValue === "on";
	const currentImageUrl = String(getValue("currentImageUrl") ?? "").trim();
	const imageUrlInput = String(getValue("imageUrl") ?? "").trim();
	const imageFile = source instanceof FormData ? source.get("imageFile") : null;

	if (!sku) {
		return jsonResponse({ ok: false, error: "Missing sku" }, 400);
	}

	if (action === "create" && (!make || !description)) {
		return jsonResponse({ ok: false, error: "Missing make or description" }, 400);
	}

	if (
		Number.isNaN(excellentPrice) ||
		(lightScratchesPrice !== null && Number.isNaN(lightScratchesPrice)) ||
		(wornPrice !== null && Number.isNaN(wornPrice)) ||
		Number.isNaN(inventoryCount) ||
		Number.isNaN(maxOrderQuantity)
	) {
		return jsonResponse({ ok: false, error: "Invalid numeric values" }, 400);
	}

	let uploadedImageUrl: string | null = null;
	try {
		if (imageFile instanceof File && imageFile.size) {
			uploadedImageUrl = await uploadCatalogImage(imageFile, sku);
		}
	} catch {
		return jsonResponse({ ok: false, error: "Could not upload key image" }, 500);
	}

	const normalizedImageUrl = imageUrlInput || currentImageUrl || null;
	const finalImageUrl = uploadedImageUrl ?? normalizedImageUrl;

	if (action === "create") {
		const { error } = await supabaseAdmin.from("key_catalog_items").insert({
			sku,
			make,
			description,
			excellent_price: excellentPrice,
			adjusted_price: wornPrice,
			light_scratches_price: lightScratchesPrice,
			worn_price: wornPrice,
			image_url: finalImageUrl,
			inventory_count: inventoryCount,
			max_order_quantity: maxOrderQuantity,
			active,
		});

		if (error) {
			return jsonResponse({ ok: false, error: "Could not create key catalog item" }, 500);
		}

		return jsonResponse({ ok: true, sku, imageUrl: finalImageUrl });
	}

	const { data, error } = await supabaseAdmin
		.from("key_catalog_items")
		.update({
			excellent_price: excellentPrice,
			adjusted_price: wornPrice,
			light_scratches_price: lightScratchesPrice,
			worn_price: wornPrice,
			image_url: finalImageUrl,
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

	return jsonResponse({ ok: true, sku, imageUrl: finalImageUrl });
};
