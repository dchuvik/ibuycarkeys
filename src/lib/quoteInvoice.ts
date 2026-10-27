import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { jsPDF } from "jspdf";

export type QuoteInvoiceDetails = {
	quoteReference: string;
	customerName: string;
	customerEmail: string;
	customerPhone?: string;
	customerAddress?: string;
	customerCity?: string;
	customerState?: string;
	customerZip?: string;
	createdAt?: string;
	clientTimezone?: string;
	estimatedPayout: string;
	totalKeys: string;
	quoteSummary: string;
};

export const createQuoteInvoice = (quote: QuoteInvoiceDetails) => {
	const doc = new jsPDF({ unit: "pt", format: "letter", compress: true });
	const margin = 48;
	const width = doc.internal.pageSize.getWidth() - margin * 2;
	const pageBottom = doc.internal.pageSize.getHeight() - 64;
	let y = margin;

	// Stable metadata makes retries produce the same invoice bytes.
	const submittedAt = new Date(quote.createdAt ?? "");
	const hasSubmittedAt = !Number.isNaN(submittedAt.getTime());
	const metadataDate = hasSubmittedAt ? submittedAt : new Date(0);
	doc.setCreationDate(`D:${metadataDate.toISOString().slice(0, 19).replace(/\D/g, "")}+00'00'`);
	doc.setFileId(createHash("sha256").update(JSON.stringify(quote)).digest("hex").slice(0, 32));
	doc.setProperties({
		title: `Quote Approval Invoice #${quote.quoteReference}`,
		author: "I Buy Car Keys",
		subject: "Approved car key quote and shipment invoice",
	});

	const write = (text: string, size = 11, bold = false, gap = 8) => {
		doc.setFont("helvetica", bold ? "bold" : "normal");
		doc.setFontSize(size);
		const lineHeight = size * 1.45;
		const lines = doc.splitTextToSize(text || "-", width) as string[];
		for (const line of lines) {
			if (y + lineHeight > pageBottom) {
				doc.addPage();
				y = margin;
			}
			doc.text(line, margin, y);
			y += lineHeight;
		}
		y += gap;
	};

	write("I Buy Car Keys", 22, true);
	write("Quote Approval Invoice", 14, true, 16);
	write(`Quote reference: #${quote.quoteReference}`);
	write(`Approved payout: ${quote.estimatedPayout || "Pending review"}`);
	write(`Total keys: ${quote.totalKeys || "-"}`);
	if (hasSubmittedAt) {
		let timeZone = quote.clientTimezone || "America/New_York";
		try {
			new Intl.DateTimeFormat("en-US", { timeZone }).format(submittedAt);
		} catch {
			timeZone = "America/New_York";
		}
		const submitted = new Intl.DateTimeFormat("en-US", {
			dateStyle: "medium", timeStyle: "short", timeZone,
		}).format(submittedAt);
		write(`Submitted: ${submitted} (${timeZone})`, 10, false, 18);
	}

	write("Customer", 12, true);
	write(quote.customerName);
	write(quote.customerEmail);
	if (quote.customerPhone) write(quote.customerPhone);
	const address = [quote.customerAddress, quote.customerCity, quote.customerState, quote.customerZip]
		.filter(Boolean).join(", ");
	if (address) write(address);
	y += 10;
	write("Shipment note", 12, true);
	write("Please include this invoice in your shipment to prevent delay in your payout.");
	y += 10;
	write("Quote details", 12, true);
	write(quote.quoteSummary || "No quote summary provided.");

	const pageCount = doc.getNumberOfPages();
	for (let page = 1; page <= pageCount; page += 1) {
		doc.setPage(page);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(9);
		doc.text(`Quote #${quote.quoteReference} | Page ${page} of ${pageCount}`, margin, pageBottom + 28);
	}

	const reference = quote.quoteReference.replace(/[^a-z0-9-]/gi, "").slice(0, 32) || "quote";
	return {
		filename: `ibuycarkeys-invoice-${reference}.pdf`,
		content: Buffer.from(doc.output("arraybuffer")).toString("base64"),
		content_type: "application/pdf",
	};
};
