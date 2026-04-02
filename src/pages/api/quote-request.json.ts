import type { APIRoute } from "astro";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "~/lib/supabaseAdmin";
import { supabaseTables } from "~/lib/supabaseTables";

export const prerender = false;

const getFieldValue = (formData: FormData, fieldName: string) => formData.get(fieldName)?.toString().trim() ?? "";

type QuoteRequestItemPayload = {
	sku?: string;
	make?: string;
	description?: string;
	condition?: string;
	quantity?: number;
	unitPrice?: number;
	lineTotal?: number;
};

export const POST: APIRoute = async ({ request }) => {
	if (!isSupabaseAdminConfigured()) {
		return new Response(JSON.stringify({ error: "Quote saving is not configured.", ok: false }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	const supabaseAdmin = getSupabaseAdmin();
	const formData = await request.formData();
	const botField = getFieldValue(formData, "bot-field");

	if (botField) {
		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	}

	const customerName = getFieldValue(formData, "customer_name");
	const customerEmail = getFieldValue(formData, "customer_email");
	const customerPhone = getFieldValue(formData, "customer_phone");
	const customerAddress = getFieldValue(formData, "customer_address");
	const customerCity = getFieldValue(formData, "customer_city");
	const customerState = getFieldValue(formData, "customer_state");
	const customerZip = getFieldValue(formData, "customer_zip");
	const quoteSummary = getFieldValue(formData, "quote_summary");
	const totalKeys = getFieldValue(formData, "total_keys");
	const estimatedPayout = getFieldValue(formData, "estimated_payout");
	const sourcePage = getFieldValue(formData, "source_page");
	const submittedAt = getFieldValue(formData, "submitted_at");
	const clientTimezone = getFieldValue(formData, "client_timezone");
	const clientUtcOffsetMinutes = getFieldValue(formData, "client_utc_offset_minutes");
	const quoteItemsJson = getFieldValue(formData, "quote_items_json");

	if (
		!customerName ||
		!customerEmail ||
		!customerPhone ||
		!customerAddress ||
		!customerCity ||
		!customerState ||
		!customerZip ||
		!quoteSummary
	) {
		return new Response(JSON.stringify({ error: "Missing required fields.", ok: false }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	let quoteItems: QuoteRequestItemPayload[] = [];
	if (quoteItemsJson) {
		try {
			const parsed = JSON.parse(quoteItemsJson) as QuoteRequestItemPayload[];
			quoteItems = Array.isArray(parsed) ? parsed : [];
		} catch {
			return new Response(JSON.stringify({ error: "Invalid quote items.", ok: false }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}
	}

	const { data: insertedQuote, error } = await supabaseAdmin
		.from(supabaseTables.quoteRequests)
		.insert({
		customer_name: customerName,
		customer_email: customerEmail,
		customer_phone: customerPhone,
		customer_address: customerAddress,
		customer_city: customerCity,
		customer_state: customerState,
		customer_zip: customerZip,
		quote_summary: quoteSummary,
		total_keys: totalKeys ? Number.parseInt(totalKeys, 10) : null,
		estimated_payout: estimatedPayout || null,
		source_page: sourcePage || request.headers.get("referer"),
		submitted_at: submittedAt || new Date().toISOString(),
		client_timezone: clientTimezone || null,
		client_utc_offset_minutes: clientUtcOffsetMinutes ? Number.parseInt(clientUtcOffsetMinutes, 10) : null,
		status: "new",
		})
		.select("id")
		.single();

	if (error) {
		return new Response(JSON.stringify({ error: "Could not save your quote request.", ok: false }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	if (quoteItems.length && insertedQuote?.id) {
		const normalizedQuoteItems = quoteItems
			.map((item) => ({
				quote_request_id: insertedQuote.id,
				sku: String(item.sku ?? "").trim(),
				make: String(item.make ?? "").trim(),
				description: String(item.description ?? "").trim(),
				condition: String(item.condition ?? "").trim(),
				quantity: Number(item.quantity ?? 0),
				unit_price: Number(item.unitPrice ?? 0),
				line_total: Number(item.lineTotal ?? 0),
			}))
			.filter(
				(item) =>
					item.sku &&
					item.make &&
					item.description &&
					item.condition &&
					Number.isFinite(item.quantity) &&
					item.quantity > 0 &&
					Number.isFinite(item.unit_price) &&
					item.unit_price >= 0 &&
					Number.isFinite(item.line_total) &&
					item.line_total >= 0
			);

		if (normalizedQuoteItems.length) {
			const { error: itemInsertError } = await supabaseAdmin.from(supabaseTables.quoteRequestItems).insert(normalizedQuoteItems);

			if (itemInsertError) {
				return new Response(JSON.stringify({ error: "Could not save your quote items.", ok: false }), {
					status: 500,
					headers: { "Content-Type": "application/json" },
				});
			}
		}
	}

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};
