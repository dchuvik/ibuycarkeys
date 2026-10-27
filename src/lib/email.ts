import { getSecret } from "astro:env/server";

type EmailPayload = {
	to: string;
	subject: string;
	html: string;
	text?: string;
	bcc?: string;
	replyTo?: string;
	idempotencyKey?: string;
	attachments?: Array<{ filename: string; content: string; content_type: string }>;
};

export const getAdminEmail = () => getSecret("ADMIN_EMAIL")?.trim() ?? "";

export const escapeHtml = (value: string) =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");

export const sendEmail = async (payload: EmailPayload) => {
	const apiKey = getSecret("RESEND_API_KEY")?.trim() ?? "";
	const from = getSecret("RESEND_FROM")?.trim() ?? "";

	if (!apiKey || !from) {
		const missing = [!apiKey && "RESEND_API_KEY", !from && "RESEND_FROM"].filter(Boolean);
		return {
			sent: false,
			error: `Resend is not configured. Missing ${missing.join(" and ")}. Set these in Netlify environment variables with the Functions scope, then redeploy.`,
		};
	}

	if (!payload.to.trim()) {
		return { sent: false, error: "Email recipient is missing." };
	}

	let response: Response;
	try {
		response = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
				...(payload.idempotencyKey ? { "Idempotency-Key": payload.idempotencyKey } : {}),
			},
			body: JSON.stringify({
				from,
				to: [payload.to],
				...(payload.bcc ? { bcc: [payload.bcc] } : {}),
				...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
				subject: payload.subject,
				html: payload.html,
				...(payload.text ? { text: payload.text } : {}),
				...(payload.attachments?.length ? { attachments: payload.attachments } : {}),
			}),
			signal: AbortSignal.timeout(10_000),
		});
	} catch {
		return { sent: false, error: "Could not reach Resend. Please try again." };
	}

	if (!response.ok) {
		let message = "Resend could not send the email.";
		try {
			const errorPayload = await response.json();
			if (typeof errorPayload?.message === "string") {
				message = errorPayload.message;
			} else if (typeof errorPayload?.error === "string") {
				message = errorPayload.error;
			}
		} catch {
			// Keep the generic message if Resend did not return JSON.
		}
		return { sent: false, error: message };
	}

	return { sent: true, error: "" };
};
