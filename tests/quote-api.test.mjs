import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const id = "11111111-1111-4111-8111-111111111111";
const quote = {
	id, status: "new", customer_name: "Saved Customer", customer_email: "saved@example.com",
	customer_phone: "555-0100", customer_address: "123 Main Street", customer_city: "Elbridge",
	customer_state: "NY", customer_zip: "13060", created_at: "2026-10-27T15:00:00Z",
	client_timezone: "America/New_York", total_keys: 3, estimated_payout: "$150.00", quote_summary: "Saved order details",
};
const request = (payload) => ({
	cookies: {}, url: new URL("https://ibuycarkeys.com/api/admin-quote-status"),
	request: new Request("https://ibuycarkeys.com/api/admin-quote-status", {
		method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
	}),
});
const loadQuote = async (options = {}) => {
	const calls = [];
	const sent = [];
	const client = { from: (table) => {
		if (table === "quote_request_items") return { select: () => ({ eq: async () => {
			calls.push("inventory"); return { data: [], error: null };
		} }) };
		assert.equal(table, "quote_requests");
		return {
			select: () => ({ eq: () => ({ maybeSingle: async () => {
				calls.push("load"); return { data: Object.hasOwn(options, "quote") ? options.quote : quote, error: options.loadError ?? null };
			} }) }),
			update: () => ({ eq: () => ({ select: async () => {
				calls.push("save"); return { data: [{ id }], error: options.saveError ?? null };
			} }) }),
		};
	} };
	const { POST } = await loadModule("src/pages/api/admin-quote-status.ts", { mocks: {
		"~/lib/accountAuth": { isAdminAccount: async () => options.authorized ?? true },
		"~/lib/supabaseAdmin": { isSupabaseAdminConfigured: () => true, getSupabaseAdmin: () => client },
		"~/lib/quoteEmails": { sendQuoteStatusEmail: async (payload) => {
			calls.push("send"); sent.push(payload); return options.email ?? { sent: true, error: "" };
		} },
	} });
	return { POST, calls, sent };
};

test("quote email actions require an admin login", async () => {
	const { POST, calls } = await loadQuote({ authorized: false });
	assert.equal((await POST(request({ id, status: "approved" }))).status, 401);
	assert.deepEqual(calls, []);
});

test("invalid quote request bodies are rejected before any email or database mutation", async () => {
	const { POST, calls } = await loadQuote();
	for (const payload of [null, { id: 123, status: "approved" }, { id, status: 123 }, { id, status: "invalid" }])
		assert.equal((await POST(request(payload))).status, 400);
	assert.deepEqual(calls, []);
});

test("approval supplies saved customer details to the server invoice builder", async () => {
	const { POST, calls, sent } = await loadQuote();
	const response = await POST(request({ id, status: "approved", customerEmail: "attacker@example.com", customerAddress: "Untrusted address" }));
	assert.equal(response.status, 200);
	assert.equal((await response.json()).emailSent, true);
	assert.deepEqual(calls, ["load", "inventory", "save", "send"]);
	assert.equal(sent[0].customerEmail, quote.customer_email);
	assert.equal(sent[0].customerAddress, quote.customer_address);
	assert.equal(sent[0].customerZip, quote.customer_zip);
	assert.equal(sent[0].customerPhone, quote.customer_phone);
	assert.equal(sent[0].createdAt, quote.created_at);
	assert.equal(sent[0].clientTimezone, quote.client_timezone);
	assert.equal(sent[0].quoteSummary, quote.quote_summary);
});

test("retrying an already approved quote does not add inventory again", async () => {
	const { POST, calls } = await loadQuote({ quote: { ...quote, status: "approved" } });
	await POST(request({ id, status: "approved" }));
	assert.deepEqual(calls, ["load", "save", "send"]);
});

test("failed email reports the error while preserving the approved quote status", async () => {
	const { POST } = await loadQuote({ email: { sent: false, error: "Could not create the PDF invoice" } });
	const result = await (await POST(request({ id, status: "approved" }))).json();
	assert.equal(result.ok, true);
	assert.equal(result.status, "approved");
	assert.equal(result.emailSent, false);
	assert.match(result.emailError, /PDF invoice/);
});

test("marking a quote new does not send an email", async () => {
	const { POST, calls } = await loadQuote();
	await POST(request({ id, status: "new" }));
	assert.deepEqual(calls, ["load", "save"]);
});

test("failed quote saves and missing quotes never send an email", async () => {
	for (const options of [{ saveError: {} }, { quote: null }, { loadError: {} }]) {
		const { POST, sent } = await loadQuote(options);
		assert.ok((await POST(request({ id, status: "approved" }))).status >= 400);
		assert.deepEqual(sent, []);
	}
});
