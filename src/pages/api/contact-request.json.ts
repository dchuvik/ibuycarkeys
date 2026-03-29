import type { APIRoute } from "astro";
import { supabase } from "~/lib/supabase";
import { supabaseTables } from "~/lib/supabaseTables";

export const prerender = false;

const getFieldValue = (formData: FormData, fieldName: string) => formData.get(fieldName)?.toString().trim() ?? "";

const createResponse = (request: Request, redirectPath: string, status: number, body: Record<string, string | boolean>) => {
	const acceptsJson = request.headers.get("accept")?.includes("application/json");

	if (acceptsJson) {
		return new Response(JSON.stringify(body), {
			status,
			headers: { "Content-Type": "application/json" },
		});
	}

	return Response.redirect(new URL(redirectPath, request.url), 302);
};

export const POST: APIRoute = async ({ request }) => {
	const formData = await request.formData();
	const botField = getFieldValue(formData, "bot-field");

	if (botField) {
		return createResponse(request, "/contact/?submitted=true", 200, { ok: true });
	}

	const firstName = getFieldValue(formData, "first-name");
	const lastName = getFieldValue(formData, "last-name");
	const email = getFieldValue(formData, "email");
	const phoneNumber = getFieldValue(formData, "phone-number");
	const message = getFieldValue(formData, "message");
	const clientTimezone = getFieldValue(formData, "client_timezone");
	const clientUtcOffsetMinutes = getFieldValue(formData, "client_utc_offset_minutes");

	if (!firstName || !lastName || !email || !message) {
		return createResponse(request, "/contact/?error=missing-fields", 400, {
			error: "Missing required fields.",
			ok: false,
		});
	}

	const { error } = await supabase.from(supabaseTables.contactMessages).insert({
		first_name: firstName,
		last_name: lastName,
		email,
		phone_number: phoneNumber || null,
		message,
		source_page: request.headers.get("referer"),
		submitted_at: new Date().toISOString(),
		client_timezone: clientTimezone || null,
		client_utc_offset_minutes: clientUtcOffsetMinutes ? Number.parseInt(clientUtcOffsetMinutes, 10) : null,
		status: "new",
	});

	if (error) {
		return createResponse(request, "/contact/?error=save-failed", 500, {
			error: "Could not save your message.",
			ok: false,
		});
	}

	return createResponse(request, "/contact/?submitted=true", 200, { ok: true });
};
