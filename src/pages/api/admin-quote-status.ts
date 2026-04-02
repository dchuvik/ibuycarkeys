import type { APIRoute } from "astro";
import { adminSessionCookieName, isValidAdminSessionToken } from "~/lib/adminAuth";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "~/lib/supabaseAdmin";
import { supabaseTables } from "~/lib/supabaseTables";

export const prerender = false;

const validStatuses = new Set(["new", "approved", "rejected"]);

export const POST: APIRoute = async ({ cookies, request }) => {
	const sessionToken = cookies.get(adminSessionCookieName)?.value;

	if (!isValidAdminSessionToken(sessionToken)) {
		return new Response(JSON.stringify({ error: "Unauthorized", ok: false }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	if (!isSupabaseAdminConfigured()) {
		return new Response(JSON.stringify({ error: "Admin is not configured", ok: false }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	let payload: { id?: string; status?: string } = {};

	try {
		payload = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid request body", ok: false }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const id = payload.id?.trim() ?? "";
	const status = payload.status?.trim().toLowerCase() ?? "";

	if (!id || !validStatuses.has(status)) {
		return new Response(JSON.stringify({ error: "Invalid quote id or status", ok: false }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const supabaseAdmin = getSupabaseAdmin();
	const {
		data: currentQuote,
		error: currentQuoteError,
	} = await supabaseAdmin
		.from(supabaseTables.quoteRequests)
		.select("id, status")
		.eq("id", id)
		.maybeSingle();

	if (currentQuoteError) {
		return new Response(JSON.stringify({ error: "Could not load quote", ok: false }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	if (!currentQuote) {
		return new Response(JSON.stringify({ error: "Quote not found", ok: false }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	const previousStatus = currentQuote.status ?? "new";
	const inventoryDelta = (status === "approved" ? 1 : 0) - (previousStatus === "approved" ? 1 : 0);

	if (inventoryDelta !== 0) {
		const { data: quoteItemsData, error: quoteItemsError } = await supabaseAdmin
			.from(supabaseTables.quoteRequestItems)
			.select("sku, quantity")
			.eq("quote_request_id", id);

		if (quoteItemsError) {
			return new Response(JSON.stringify({ error: "Could not load quote items", ok: false }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			});
		}

		const quoteItems = (quoteItemsData ?? []).map((item) => ({
			sku: String(item.sku ?? ""),
			quantity: Number(item.quantity ?? 0),
		}));

		if (quoteItems.length) {
			const { data: catalogRows, error: catalogError } = await supabaseAdmin
				.from("key_catalog_items")
				.select("sku, inventory_count")
				.in(
					"sku",
					quoteItems.map((item) => item.sku)
				);

			if (catalogError) {
				return new Response(JSON.stringify({ error: "Could not update catalog inventory", ok: false }), {
					status: 500,
					headers: { "Content-Type": "application/json" },
				});
			}

			const inventoryBySku = new Map(
				(catalogRows ?? []).map((row) => [String(row.sku), Number(row.inventory_count ?? 0)])
			);

			for (const item of quoteItems) {
				if (!inventoryBySku.has(item.sku)) {
					continue;
				}

				const nextInventory = Math.max(0, (inventoryBySku.get(item.sku) ?? 0) + item.quantity * inventoryDelta);
				const { error: inventoryUpdateError } = await supabaseAdmin
					.from("key_catalog_items")
					.update({
						inventory_count: nextInventory,
						updated_at: new Date().toISOString(),
					})
					.eq("sku", item.sku);

				if (inventoryUpdateError) {
					return new Response(JSON.stringify({ error: "Could not update catalog inventory", ok: false }), {
						status: 500,
						headers: { "Content-Type": "application/json" },
					});
				}
			}
		}
	}

	const { data, error } = await supabaseAdmin
		.from(supabaseTables.quoteRequests)
		.update({ status })
		.eq("id", id)
		.select("id");

	if (error) {
		return new Response(JSON.stringify({ error: "Could not update quote status", ok: false }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	if (!data?.length) {
		return new Response(JSON.stringify({ error: "Quote not found", ok: false }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	return new Response(JSON.stringify({ ok: true, status }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};
