import type { APIRoute } from "astro";
import { supabase } from "~/lib/supabase";
import { supabaseTables } from "~/lib/supabaseTables";

export const prerender = false;

const getFieldValue = (formData: FormData, fieldName: string) => formData.get(fieldName)?.toString().trim() ?? "";

export const POST: APIRoute = async ({ request }) => {
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

	const { error } = await supabase.from(supabaseTables.quoteRequests).insert({
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
	});

	if (error) {
		return new Response(JSON.stringify({ error: "Could not save your quote request.", ok: false }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};
