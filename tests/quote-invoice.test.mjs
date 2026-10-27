import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const quote = {
	quoteReference: "1234abcd",
	customerName: "Example Customer",
	customerEmail: "customer@example.com",
	customerPhone: "555-0100",
	customerAddress: "123 Main Street",
	customerCity: "Elbridge",
	customerState: "NY",
	customerZip: "13060",
	createdAt: "2026-10-27T15:00:00.000Z",
	clientTimezone: "America/New_York",
	estimatedPayout: "$150.00",
	totalKeys: "3",
	quoteSummary: "Example key: 3 at $50.00 each",
};

const readPdf = (attachment) => {
	const bytes = Buffer.from(attachment.content, "base64");
	const raw = bytes.toString("latin1");
	const streams = [...raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
		.map((match) => inflateSync(Buffer.from(match[1], "latin1")).toString("latin1"));
	return { bytes, raw, text: streams.join("\n"), pages: [...raw.matchAll(/\/Type \/Page\b/g)].length };
};

test("invoice is an actual PDF containing saved customer and quote details", async () => {
	const { createQuoteInvoice } = await loadModule("src/lib/quoteInvoice.ts");
	const attachment = createQuoteInvoice(quote);
	assert.equal(attachment.filename, "ibuycarkeys-invoice-1234abcd.pdf");
	assert.equal(attachment.content_type, "application/pdf");
	const pdf = readPdf(attachment);
	assert.ok(pdf.raw.startsWith("%PDF-"));
	assert.ok(pdf.raw.trimEnd().endsWith("%%EOF"));
	assert.equal(pdf.pages, 1);
	for (const text of [quote.customerName, quote.customerEmail, quote.customerPhone, quote.customerAddress, quote.customerCity,
		quote.customerZip, quote.estimatedPayout, "Total keys: 3", quote.quoteReference, quote.quoteSummary, "include this invoice in your shipment"])
		assert.ok(pdf.text.includes(text), `Invoice is missing ${text}`);
});

test("long quote summaries continue across pages without dropping the end of the order", async () => {
	const { createQuoteInvoice } = await loadModule("src/lib/quoteInvoice.ts");
	const summary = Array.from({ length: 180 }, (_, index) => `Key item ${index + 1}: quantity 3 at $50.00 each`).join("\n");
	const pdf = readPdf(createQuoteInvoice({ ...quote, quoteSummary: summary }));
	assert.ok(pdf.pages > 1);
	assert.ok(pdf.text.includes("Key item 1:"));
	assert.ok(pdf.text.includes("Key item 180:"));
	assert.ok(pdf.text.includes(`Page ${pdf.pages} of ${pdf.pages}`));
});

test("invoice bytes stay stable when the same saved quote is retried", async () => {
	const { createQuoteInvoice } = await loadModule("src/lib/quoteInvoice.ts");
	assert.equal(createQuoteInvoice(quote).content, createQuoteInvoice(quote).content);
});

test("missing optional contact fields and invalid time zones do not prevent an invoice", async () => {
	const { createQuoteInvoice } = await loadModule("src/lib/quoteInvoice.ts");
	const { customerPhone, customerAddress, customerCity, customerState, customerZip, createdAt, ...minimal } = quote;
	assert.equal(readPdf(createQuoteInvoice(minimal)).pages, 1);
	assert.equal(readPdf(createQuoteInvoice({ ...quote, clientTimezone: "invalid-zone" })).pages, 1);
});

test("invoice filenames contain no paths or control characters", async () => {
	const { createQuoteInvoice } = await loadModule("src/lib/quoteInvoice.ts");
	const attachment = createQuoteInvoice({ ...quote, quoteReference: "../1234\r\n.pdf" });
	assert.match(attachment.filename, /^ibuycarkeys-invoice-[a-z0-9-]+\.pdf$/i);
});
