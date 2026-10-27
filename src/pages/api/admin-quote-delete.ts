import type { APIRoute } from "astro";
import { isAdminAccount } from "~/lib/accountAuth";
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

	const origin = request.headers.get("origin");
	if (origin && origin !== url.origin) {
		return jsonResponse({ ok: false, error: "Invalid request origin" }, 403);
	}
	if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
		return jsonResponse({ ok: false, error: "Send a JSON request body" }, 415);
	}
	if (!isSupabaseAdminConfigured()) {
		return jsonResponse({ ok: false, error: "Admin is not configured" }, 500);
	}

	let payload: { id?: unknown };
	try {
		payload = await request.json();
	} catch {
		return jsonResponse({ ok: false, error: "Invalid request body" }, 400);
	}
	const id = typeof payload?.id === "string" ? payload.id.trim() : "";
	if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
		return jsonResponse({ ok: false, error: "Choose a valid quote" }, 400);
	}

	try {
		// The quote's items cascade in the database. Deletion does not reverse inventory or send email.
		const { data, error } = await getSupabaseAdmin()
			.from(supabaseTables.quoteRequests)
			.delete()
			.eq("id", id)
			.select("id");
		if (error) {
			return jsonResponse({ ok: false, error: "Could not delete quote" }, 500);
		}
		if (!data?.length) {
			return jsonResponse({ ok: false, error: "Quote not found. Refresh the list." }, 404);
		}
		return jsonResponse({ ok: true, id });
	} catch {
		return jsonResponse({ ok: false, error: "Could not delete quote" }, 500);
	}
};
