import { createHash } from "node:crypto";
import { escapeHtml, getAdminEmail, sendEmail } from "~/lib/email";

type ContactEmailPayload = {
	contactId: string;
	customerName: string;
	customerEmail: string;
	originalMessage: string;
};

export const sendContactReplyEmail = async (
	payload: ContactEmailPayload & { message: string },
) => {
	const adminEmail = getAdminEmail();
	const text = [
		`Hi ${payload.customerName || "there"},`,
		"",
		payload.message,
		"",
		"Thank you,",
		"I Buy Car Keys",
		"",
		"Original message:",
		payload.originalMessage,
	].join("\n");
	const fingerprint = createHash("sha256")
		.update(JSON.stringify([payload.customerEmail, text, adminEmail]))
		.digest("hex");

	return sendEmail({
		to: payload.customerEmail,
		subject: "Re: Your message to I Buy Car Keys",
		text,
		html: `<p>${escapeHtml(text).replace(/\n/g, "<br />")}</p>`,
		bcc: adminEmail.toLowerCase() !== payload.customerEmail.toLowerCase() ? adminEmail : "",
		replyTo: adminEmail,
		// Retrying the same reply after a network or status-update failure must not send it twice.
		idempotencyKey: `contact-reply/${payload.contactId}/${fingerprint}`,
	});
};

export const sendContactNotificationEmail = async (
	payload: ContactEmailPayload & { phoneNumber: string },
) => {
	const adminEmail = getAdminEmail();
	if (!adminEmail) {
		return { sent: false, error: "ADMIN_EMAIL is not configured for contact notifications." };
	}

	const adminUrl = "https://ibuycarkeys.com/admin/#contacts";
	const text = [
		"You received a new contact message.",
		"",
		`Name: ${payload.customerName}`,
		`Email: ${payload.customerEmail}`,
		`Phone: ${payload.phoneNumber || "Not provided"}`,
		"",
		payload.originalMessage,
		"",
		`View and reply: ${adminUrl}`,
	].join("\n");

	return sendEmail({
		to: adminEmail,
		replyTo: payload.customerEmail,
		subject: "New contact message — I Buy Car Keys",
		text,
		html: `<p>${escapeHtml(text).replace(/\n/g, "<br />")}</p><p><a href="${adminUrl}">View and reply in the admin dashboard</a></p>`,
		idempotencyKey: `contact-notification/${payload.contactId}`,
	});
};
