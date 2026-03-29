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
	const { error } = await supabaseAdmin
		.from(supabaseTables.quoteRequests)
		.update({ status })
		.eq("id", id);

	if (error) {
		return new Response(JSON.stringify({ error: "Could not update quote status", ok: false }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	return new Response(JSON.stringify({ ok: true, status }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
};
