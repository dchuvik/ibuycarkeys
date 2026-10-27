import { escapeHtml, getAdminEmail, sendEmail } from "~/lib/email";
import { createQuoteInvoice, type QuoteInvoiceDetails } from "~/lib/quoteInvoice";
import { quoteShippingAddress } from "~/lib/quoteShipping";

type QuoteEmailStatus = "approved" | "rejected";

type QuoteEmailPayload = QuoteInvoiceDetails & {
	status: QuoteEmailStatus;
};

const buildApprovedEmail = (payload: QuoteEmailPayload) => {
	const customerName = escapeHtml(payload.customerName || "there");
	const payout = escapeHtml(payload.estimatedPayout || "the approved amount");
	const quoteReference = escapeHtml(payload.quoteReference);
	const totalKeys = escapeHtml(payload.totalKeys || "-");
	const quoteSummary = escapeHtml(payload.quoteSummary || "No quote summary provided.").replace(/\n/g, "<br />");
	const shippingAddress = escapeHtml(quoteShippingAddress).replace(/\n/g, "<br />");

	return {
		subject: "Your car key quote has been accepted — Invoice attached",
		html: `
			<p>Hi ${customerName},</p>
			<p>Your quote has been accepted for <strong>${payout}</strong>.</p>
			<p>Your PDF invoice is attached. Please print it and include it in your shipment so we can process your payout without delay.</p>
			<p><strong>Ship to:</strong><br />${shippingAddress}</p>
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
	if (!payload.customerEmail) {
		return { sent: false, error: "Customer email is missing." };
	}

	const email = payload.status === "approved" ? buildApprovedEmail(payload) : buildRejectedEmail(payload);
	let attachments;
	if (payload.status === "approved") {
		try {
			attachments = [createQuoteInvoice(payload)];
		} catch {
			return { sent: false, error: "Could not create the PDF invoice. Please try approving the quote again." };
		}
	}
	const adminEmail = getAdminEmail();
	return sendEmail({
		to: payload.customerEmail,
		bcc: adminEmail.toLowerCase() !== payload.customerEmail.toLowerCase() ? adminEmail : "",
		replyTo: adminEmail,
		attachments,
		...email,
	});
};
