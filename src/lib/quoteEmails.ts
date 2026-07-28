type QuoteEmailStatus = "approved" | "rejected";

type QuoteEmailPayload = {
	status: QuoteEmailStatus;
	customerName: string;
	customerEmail: string;
	estimatedPayout: string;
	totalKeys: string;
	quoteSummary: string;
	quoteReference: string;
};

const getEnv = (key: string) => globalThis.process?.env?.[key]?.trim() ?? import.meta.env[key]?.trim?.() ?? "";

const escapeHtml = (value: string) =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");

const buildApprovedEmail = (payload: QuoteEmailPayload) => {
	const customerName = escapeHtml(payload.customerName || "there");
	const payout = escapeHtml(payload.estimatedPayout || "the approved amount");
	const quoteReference = escapeHtml(payload.quoteReference);
	const totalKeys = escapeHtml(payload.totalKeys || "-");
	const quoteSummary = escapeHtml(payload.quoteSummary || "No quote summary provided.").replace(/\n/g, "<br />");

	return {
		subject: "Your car key quote has been accepted",
		html: `
			<p>Hi ${customerName},</p>
			<p>Your quote has been accepted for <strong>${payout}</strong>.</p>
			<p>Please include your quote reference in your shipment so we can process your payout without delay.</p>
			<p><strong>Quote reference:</strong> #${quoteReference}<br /><strong>Total keys:</strong> ${totalKeys}</p>
			<p><strong>Quote details:</strong></p>
			<p>${quoteSummary}</p>
			<p>Thank you,<br />I Buy Car Keys</p>
		`,
	};
};

const buildRejectedEmail = (payload: QuoteEmailPayload) => {
	const customerName = escapeHtml(payload.customerName || "there");
	const quoteReference = escapeHtml(payload.quoteReference);

	return {
		subject: "Update on your car key quote",
		html: `
			<p>Hi ${customerName},</p>
			<p>Thank you for sending your quote request. We are unable to accept this quote at this time.</p>
			<p><strong>Quote reference:</strong> #${quoteReference}</p>
			<p>If you would like us to take another look, reply with any updated details or photos.</p>
			<p>Thank you,<br />I Buy Car Keys</p>
		`,
	};
};

export const sendQuoteStatusEmail = async (payload: QuoteEmailPayload) => {
	const apiKey = getEnv("RESEND_API_KEY");
	const from = getEnv("RESEND_FROM");
	const adminEmail = getEnv("ADMIN_EMAIL");

	if (!apiKey || !from) {
		return { sent: false, error: "Resend is not configured." };
	}

	if (!payload.customerEmail) {
		return { sent: false, error: "Customer email is missing." };
	}

	const email = payload.status === "approved" ? buildApprovedEmail(payload) : buildRejectedEmail(payload);
	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from,
			to: [payload.customerEmail],
			...(adminEmail ? { bcc: [adminEmail] } : {}),
			subject: email.subject,
			html: email.html,
		}),
	});

	if (!response.ok) {
		let message = "Resend could not send the email.";
		try {
			const errorPayload = await response.json();
			message = errorPayload.message ?? errorPayload.error ?? message;
		} catch {
			// Keep the generic message if Resend did not return JSON.
		}
		return { sent: false, error: message };
	}

	return { sent: true, error: "" };
};
