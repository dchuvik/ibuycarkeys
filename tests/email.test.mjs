import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const configured = { RESEND_API_KEY: "re_test", RESEND_FROM: "I Buy Car Keys <quotes@example.com>" };
const payload = { to: "customer@example.com", subject: "Test", html: "<p>Hello</p>" };
const contact = {
	contactId: "11111111-1111-4111-8111-111111111111",
	customerName: "Customer <script>",
	customerEmail: "customer@example.com",
	originalMessage: "A question\n<script>alert(1)</script>",
	message: "Our reply\nSecond line",
};
const loadEmailModule = (entry, env, fetch) => loadModule(entry, {
	mocks: { "astro:env/server": { getSecret: (key) => env[key] } },
	fetch,
});

test("missing Resend configuration identifies the missing settings without sending", async () => {
	for (const [env, expected] of [
		[{}, "RESEND_API_KEY and RESEND_FROM"],
		[{ RESEND_API_KEY: "  " }, "RESEND_API_KEY and RESEND_FROM"],
		[{ RESEND_API_KEY: "re_test" }, "RESEND_FROM"],
		[{ RESEND_FROM: configured.RESEND_FROM }, "RESEND_API_KEY"],
	]) {
		const { sendEmail } = await loadEmailModule("src/lib/email.ts", env);
		const result = await sendEmail(payload);
		assert.equal(result.sent, false);
		assert.ok(result.error.includes(`Missing ${expected}.`));
	}
});

test("sender uses runtime secrets, verified From, optional reply headers, and idempotency", async () => {
	let request;
	const { sendEmail } = await loadEmailModule("src/lib/email.ts", { ...configured, RESEND_API_KEY: " re_test " }, async (url, options) => {
		request = { url, ...options };
		return new Response('{}');
	});
	assert.equal((await sendEmail({ ...payload, text: "Hello", bcc: "admin@example.com", replyTo: "reply@example.com", idempotencyKey: "contact/one" })).sent, true);
	assert.equal(request.url, "https://api.resend.com/emails");
	assert.equal(request.headers.Authorization, "Bearer re_test");
	assert.equal(request.headers["Idempotency-Key"], "contact/one");
	assert.deepEqual(JSON.parse(request.body), {
		from: configured.RESEND_FROM, to: [payload.to], bcc: ["admin@example.com"], reply_to: "reply@example.com",
		subject: "Test", html: "<p>Hello</p>", text: "Hello",
	});
});

test("missing recipient does not send", async () => {
	const { sendEmail } = await loadEmailModule("src/lib/email.ts", configured);
	assert.equal((await sendEmail({ ...payload, to: " " })).sent, false);
});

test("provider rejections and network errors return a failed send", async () => {
	for (const [fetch, expected] of [
		[async () => new Response('{"message":"Domain not verified"}', { status: 403 }), "Domain not verified"],
		[async () => new Response("Unavailable", { status: 503 }), "Resend could not send the email."],
		[async () => new Response('{"error":{"detail":"bad"}}', { status: 400 }), "Resend could not send the email."],
		[async () => { throw new TypeError("fetch failed"); }, "Could not reach Resend. Please try again."],
	]) {
		const { sendEmail } = await loadEmailModule("src/lib/email.ts", configured, fetch);
		const result = await sendEmail(payload);
		assert.equal(result.sent, false);
		assert.equal(result.error, expected);
	}
});

test("contact replies escape user content, send to the customer, and route follow-ups to admin", async () => {
	const requests = [];
	const { sendContactReplyEmail } = await loadEmailModule("src/lib/contactEmails.ts", { ...configured, ADMIN_EMAIL: "admin@example.com" }, async (url, options) => {
		requests.push({ headers: options.headers, body: JSON.parse(options.body) });
		return new Response('{}');
	});
	await sendContactReplyEmail(contact);
	await sendContactReplyEmail(contact);
	await sendContactReplyEmail({ ...contact, message: "A different reply" });
	const first = requests[0];
	assert.deepEqual(first.body.to, [contact.customerEmail]);
	assert.deepEqual(first.body.bcc, ["admin@example.com"]);
	assert.equal(first.body.reply_to, "admin@example.com");
	assert.ok(first.body.text.includes(contact.message));
	assert.ok(first.body.text.includes(contact.originalMessage));
	assert.ok(first.body.html.includes("&lt;script&gt;"));
	assert.ok(!first.body.html.includes("<script>"));
	assert.equal(first.headers["Idempotency-Key"], requests[1].headers["Idempotency-Key"]);
	assert.notEqual(first.headers["Idempotency-Key"], requests[2].headers["Idempotency-Key"]);
});

test("contact replies work without admin copies", async () => {
	const { sendContactReplyEmail } = await loadEmailModule("src/lib/contactEmails.ts", configured, async (url, options) => {
		const body = JSON.parse(options.body);
		assert.equal("bcc" in body, false);
		assert.equal("reply_to" in body, false);
		return new Response('{}');
	});
	assert.equal((await sendContactReplyEmail(contact)).sent, true);
});

test("contact notification requires ADMIN_EMAIL", async () => {
	const { sendContactNotificationEmail } = await loadEmailModule("src/lib/contactEmails.ts", configured);
	assert.match((await sendContactNotificationEmail(contact)).error, /ADMIN_EMAIL/);
});

test("contact alert goes only to admin and uses the customer address as Reply-To", async () => {
	const { sendContactNotificationEmail } = await loadEmailModule("src/lib/contactEmails.ts", { ...configured, ADMIN_EMAIL: "admin@example.com" }, async (url, options) => {
		const body = JSON.parse(options.body);
		assert.deepEqual(body.to, ["admin@example.com"]);
		assert.equal(body.from, configured.RESEND_FROM);
		assert.equal(body.reply_to, contact.customerEmail);
		assert.ok(body.html.includes("/admin/#contacts"));
		assert.ok(!body.html.includes("<script>"));
		return new Response('{}');
	});
	assert.equal((await sendContactNotificationEmail({ ...contact, phoneNumber: "555-0100" })).sent, true);
});

test("quote approval and rejection still send their existing templates and admin copies", async () => {
	const requests = [];
	const { sendQuoteStatusEmail } = await loadEmailModule("src/lib/quoteEmails.ts", { ...configured, ADMIN_EMAIL: "admin@example.com" }, async (url, options) => {
		requests.push(JSON.parse(options.body));
		return new Response('{}');
	});
	const quote = { ...contact, estimatedPayout: "$50", totalKeys: "2", quoteSummary: "First\nSecond", quoteReference: "12345678" };
	assert.equal((await sendQuoteStatusEmail({ ...quote, status: "approved" })).sent, true);
	assert.equal((await sendQuoteStatusEmail({ ...quote, status: "rejected" })).sent, true);
	assert.match(requests[0].subject, /accepted/);
	assert.match(requests[0].html, /First<br \/>Second/);
	assert.match(requests[0].html, /&lt;script&gt;/);
	assert.match(requests[1].subject, /Update/);
	assert.deepEqual(requests[0].bcc, ["admin@example.com"]);
	assert.equal(requests[0].reply_to, "admin@example.com");
	assert.equal(requests[0].attachments.length, 1);
	assert.equal(requests[0].attachments[0].filename, "ibuycarkeys-invoice-12345678.pdf");
	assert.equal(requests[0].attachments[0].content_type, "application/pdf");
	assert.ok(Buffer.from(requests[0].attachments[0].content, "base64").toString("latin1").startsWith("%PDF-"));
	assert.ok(requests[0].html.includes("invoice is attached"));
	assert.equal("attachments" in requests[1], false);
});

test("approval does not send an email if invoice generation fails", async () => {
	const { sendQuoteStatusEmail } = await loadModule("src/lib/quoteEmails.ts", { mocks: {
		"astro:env/server": { getSecret: (key) => configured[key] },
		"~/lib/quoteInvoice": { createQuoteInvoice: () => { throw new Error("PDF failure"); } },
	} });
	const result = await sendQuoteStatusEmail({
		...contact, status: "approved", quoteReference: "12345678",
		estimatedPayout: "$50", totalKeys: "2", quoteSummary: "Example keys",
	});
	assert.equal(result.sent, false);
	assert.match(result.error, /Could not create the PDF invoice/);
});
