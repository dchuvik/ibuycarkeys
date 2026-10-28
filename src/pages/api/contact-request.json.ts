import type { APIRoute } from "astro";
import { randomUUID } from "node:crypto";
import { sendContactNotificationEmail } from "~/lib/contactEmails";
import { verifyContactChallenge } from "~/lib/contactProtection";
import { supabase } from "~/lib/supabase";
import { supabaseTables } from "~/lib/supabaseTables";

export const prerender = false;

const getFieldValue = (formData: FormData, fieldName: string) => {
	const value = formData.get(fieldName);
	return typeof value === "string" ? value.trim() : "";
};

// Names may contain international characters and punctuation, but not markup or links.
const isValidName = (value: string) =>
	value.length <= 100 && !/[<>\u0000-\u001f\u007f]|https?:\/\/|www\./i.test(value);

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
	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return createResponse(request, "/contact/?error=invalid-fields", 400, {
			error: "Submit the contact form with valid text fields.",
			ok: false,
		});
	}
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

	if (
		!isValidName(firstName) ||
		!isValidName(lastName) ||
		phoneNumber.length > 50 ||
		email.length > 254 ||
		!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email) ||
		message.length > 10_000
	) {
		return createResponse(request, "/contact/?error=invalid-fields", 400, {
			error: "Use names of up to 100 characters without HTML or links, a valid email address, a phone number of up to 50 characters, and a message of up to 10,000 characters.",
			ok: false,
		});
	}

	const verification = await verifyContactChallenge(
		getFieldValue(formData, "cf-turnstile-response"),
		new URL(request.url).hostname,
	);
	if (!verification.ok) {
		return createResponse(request, "/contact/?error=security-check", verification.status, {
			error: verification.error,
			ok: false,
		});
	}

	const contactId = randomUUID();
	const { error } = await supabase.from(supabaseTables.contactMessages).insert({
		id: contactId,
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

	const notification = await sendContactNotificationEmail({
		contactId,
		customerName: `${firstName} ${lastName}`,
		customerEmail: email,
		phoneNumber,
		originalMessage: message,
	});
	if (!notification.sent) {
		console.warn("Contact message saved, but its email notification was not sent:", notification.error);
	}

	return createResponse(request, "/contact/?submitted=true", 200, { ok: true });
};
