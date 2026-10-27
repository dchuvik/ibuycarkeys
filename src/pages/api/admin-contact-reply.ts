import type { APIRoute } from "astro";
import { isAdminAccount } from "~/lib/accountAuth";
import { sendContactReplyEmail } from "~/lib/contactEmails";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "~/lib/supabaseAdmin";
import { supabaseTables } from "~/lib/supabaseTables";

export const prerender = false;

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});

export const POST: APIRoute = async ({ cookies, request, url }) => {
	if (!(await isAdminAccount(cookies, url.protocol === "https:"))) {
		return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
	}

	if (!isSupabaseAdminConfigured()) {
		return jsonResponse({ ok: false, error: "Admin is not configured" }, 500);
	}

	let payload: { id?: unknown; message?: unknown };
	try {
		payload = await request.json();
	} catch {
		return jsonResponse({ ok: false, error: "Invalid request body" }, 400);
	}

	const id = typeof payload?.id === "string" ? payload.id.trim() : "";
	const message = typeof payload?.message === "string" ? payload.message.trim() : "";
	if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) || !message || message.length > 10_000) {
		return jsonResponse({ ok: false, error: "Choose a contact and enter a reply of 1–10,000 characters." }, 400);
	}

	const supabaseAdmin = getSupabaseAdmin();
	const { data: contact, error: loadError } = await supabaseAdmin
		.from(supabaseTables.contactMessages)
		.select("id, first_name, last_name, email, message, status")
		.eq("id", id)
		.maybeSingle();

	if (loadError) {
		return jsonResponse({ ok: false, error: "Could not load contact message" }, 500);
	}
	if (!contact) {
		return jsonResponse({ ok: false, error: "Contact message not found" }, 404);
	}
	if (!contact.email) {
		return jsonResponse({ ok: false, error: "The contact email address is missing." }, 400);
	}

	const result = await sendContactReplyEmail({
		contactId: id,
		customerName: [contact.first_name, contact.last_name].filter(Boolean).join(" "),
		customerEmail: contact.email,
		originalMessage: contact.message,
		message,
	});
	if (!result.sent) {
		return jsonResponse({ ok: false, emailSent: false, error: result.error }, 502);
	}

	const { data, error: updateError } = await supabaseAdmin
		.from(supabaseTables.contactMessages)
		.update({ status: "replied" })
		.eq("id", id)
		.select("id");

	if (updateError || !data?.length) {
		return jsonResponse({
			ok: true,
			emailSent: true,
			status: contact.status ?? "new",
			warning: "Your reply was sent, but the message could not be marked as replied. Refresh before sending another reply.",
		});
	}

	return jsonResponse({ ok: true, emailSent: true, status: "replied" });
};
