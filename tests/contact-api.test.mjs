import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const contactId = "11111111-1111-4111-8111-111111111111";
const contact = { id: contactId, first_name: "Customer", last_name: "Example", email: "customer@example.com", message: "My question", status: "new" };
const replyRequest = (payload) => ({
	cookies: {}, url: new URL("https://ibuycarkeys.com/api/admin-contact-reply"),
	request: new Request("https://ibuycarkeys.com/api/admin-contact-reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
});

const loadReply = async (overrides = {}) => {
	const calls = [];
	const sent = [];
	const client = { from: () => ({
		select: () => ({ eq: () => ({ maybeSingle: async () => {
			calls.push("load");
			return { data: Object.hasOwn(overrides, "contact") ? overrides.contact : contact, error: overrides.loadError ?? null };
		} }) }),
		update: (values) => {
			calls.push("update");
			assert.equal(values.status, "replied");
			return { eq: () => ({ select: async () => ({ data: [{ id: contactId }], error: overrides.updateError ?? null }) }) };
		},
	}) };
	const { POST } = await loadModule("src/pages/api/admin-contact-reply.ts", { mocks: {
		"~/lib/accountAuth": { isAdminAccount: async () => overrides.authorized ?? true },
		"~/lib/supabaseAdmin": { isSupabaseAdminConfigured: () => overrides.configured ?? true, getSupabaseAdmin: () => client },
		"~/lib/contactEmails": { sendContactReplyEmail: async (payload) => {
			calls.push("send"); sent.push(payload);
			return overrides.sendResult ?? { sent: true, error: "" };
		} },
	} });
	return { POST, calls, sent };
};

test("only authenticated admins can send contact replies", async () => {
	const { POST, calls } = await loadReply({ authorized: false });
	assert.equal((await POST(replyRequest({ id: contactId, message: "Reply" }))).status, 401);
	assert.deepEqual(calls, []);
});

test("unconfigured admin service rejects sending", async () => {
	const { POST, calls } = await loadReply({ configured: false });
	assert.equal((await POST(replyRequest({ id: contactId, message: "Reply" }))).status, 500);
	assert.deepEqual(calls, []);
});

test("invalid JSON, IDs, blank replies, and oversized replies never send or update", async () => {
	const { POST, calls } = await loadReply();
	for (const payload of [null, {}, { id: 123, message: "Reply" }, { id: "bad", message: "Reply" }, { id: contactId, message: " " }, { id: contactId, message: 123 }, { id: contactId, message: "x".repeat(10_001) }]) {
		assert.equal((await POST(replyRequest(payload))).status, 400);
	}
	const invalid = replyRequest({});
	invalid.request = new Request(invalid.url, { method: "POST", body: "not-json" });
	assert.equal((await POST(invalid)).status, 400);
	assert.deepEqual(calls, []);
});

test("missing contacts and failed reads never send", async () => {
	for (const [options, status] of [[{ contact: null }, 404], [{ loadError: {} }, 500], [{ contact: { ...contact, email: "" } }, 400]]) {
		const { POST, calls } = await loadReply(options);
		assert.equal((await POST(replyRequest({ id: contactId, message: "Reply" }))).status, status);
		assert.deepEqual(calls, ["load"]);
	}
});

test("failed email leaves the contact status unchanged", async () => {
	const { POST, calls } = await loadReply({ sendResult: { sent: false, error: "Resend is unavailable" } });
	const response = await POST(replyRequest({ id: contactId, message: "Reply" }));
	assert.equal(response.status, 502);
	assert.equal((await response.json()).emailSent, false);
	assert.deepEqual(calls, ["load", "send"]);
});

test("successful email uses the saved recipient and only then marks the contact replied", async () => {
	const { POST, calls, sent } = await loadReply();
	const response = await POST(replyRequest({ id: contactId, message: " Reply ", to: "attacker@example.com", customerEmail: "attacker@example.com" }));
	assert.equal(response.status, 200);
	assert.deepEqual(await response.json(), { ok: true, emailSent: true, status: "replied" });
	assert.deepEqual(calls, ["load", "send", "update"]);
	assert.equal(sent[0].customerEmail, contact.email);
	assert.equal(sent[0].originalMessage, contact.message);
	assert.equal(sent[0].message, "Reply");
});

test("a failed status update still reports that the email was sent", async () => {
	const { POST, calls } = await loadReply({ updateError: {} });
	const response = await POST(replyRequest({ id: contactId, message: "Reply" }));
	const result = await response.json();
	assert.equal(result.emailSent, true);
	assert.equal(result.status, "new");
	assert.match(result.warning, /was sent/);
	assert.deepEqual(calls, ["load", "send", "update"]);
});

test("the status-only endpoint cannot mark a message replied without sending", async () => {
	const { POST } = await loadModule("src/pages/api/admin-contact-status.ts", { mocks: {
		"~/lib/accountAuth": { isAdminAccount: async () => true },
		"~/lib/supabaseAdmin": { isSupabaseAdminConfigured: () => true, getSupabaseAdmin: () => { throw new Error("Unexpected mutation"); } },
	} });
	assert.equal((await POST(replyRequest({ id: contactId, status: "replied" }))).status, 400);
});

const submission = { "first-name": "Customer", "last-name": "Example", email: "customer@example.com", message: "My question" };
const contactRequest = (values = {}, acceptJson = true) => ({ request: new Request("https://ibuycarkeys.com/api/contact-request.json", {
	method: "POST", headers: { ...(acceptJson ? { Accept: "application/json" } : {}), "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ...submission, ...values }),
}) });
const loadSubmission = async (options = {}) => {
	const calls = [];
	let saved;
	const { POST } = await loadModule("src/pages/api/contact-request.json.ts", { mocks: {
		"astro:env/server": { getSecret: () => undefined },
		"~/lib/supabase": { supabase: { from: () => ({ insert: async (row) => { calls.push("save"); saved = row; return { error: options.saveError ?? null }; } }) } },
		"~/lib/contactEmails": { sendContactNotificationEmail: async (payload) => {
			calls.push("notify");
			assert.equal(payload.contactId, saved.id);
			assert.equal(payload.customerEmail, saved.email);
			return options.notification ?? { sent: true, error: "" };
		} },
	} });
	return { POST, calls };
};

test("contact submissions save before notifying admin", async () => {
	const { POST, calls } = await loadSubmission();
	assert.deepEqual(await (await POST(contactRequest())).json(), { ok: true });
	assert.deepEqual(calls, ["save", "notify"]);
});

test("honeypot and invalid submissions never send notifications", async () => {
	const { POST, calls } = await loadSubmission();
	assert.equal((await POST(contactRequest({ "bot-field": "bot" }))).status, 200);
	for (const values of [{ email: "invalid" }, { message: "" }, { message: "x".repeat(10_001) }]) {
		assert.equal((await POST(contactRequest(values))).status, 400);
	}
	assert.deepEqual(calls, []);
});

test("HTML and links in names and oversized identity fields never save or notify", async () => {
	const { POST, calls } = await loadSubmission();
	for (const values of [
		{ "first-name": '* * * <a href="https://google.com">$3,222 deposit available</a> * * *' },
		{ "last-name": "Visit https://spam.example" },
		{ "first-name": "www.spam.example" },
		{ "first-name": "First\nname" },
		{ "last-name": "x".repeat(101) },
		{ "first-name": "x".repeat(101) },
		{ "phone-number": "1".repeat(51) },
		{ email: "<bad>@example.com" },
	]) {
		assert.equal((await POST(contactRequest(values))).status, 400);
	}
	assert.deepEqual(calls, []);
});

test("international and punctuated names and links in genuine messages remain allowed", async () => {
	const { POST, calls } = await loadSubmission();
	const response = await POST(contactRequest({
		"first-name": "María-José", "last-name": "O'Neill 王", "phone-number": "+1 (555) 010-1234 ext. 12",
		message: "Can you quote this key? https://example.com/my-key",
	}));
	assert.equal(response.status, 200);
	assert.deepEqual(calls, ["save", "notify"]);
});

test("malformed contact request bodies return a validation error without saving", async () => {
	const { POST, calls } = await loadSubmission();
	const response = await POST({ request: new Request("https://ibuycarkeys.com/api/contact-request.json", {
		method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: "{}",
	}) });
	assert.equal(response.status, 400);
	assert.equal((await response.json()).ok, false);
	assert.deepEqual(calls, []);
});

test("a failed save does not send a contact alert", async () => {
	const { POST, calls } = await loadSubmission({ saveError: {} });
	assert.equal((await POST(contactRequest())).status, 500);
	assert.deepEqual(calls, ["save"]);
});

test("notification failure does not lose the saved contact or invite resubmission", async () => {
	const { POST, calls } = await loadSubmission({ notification: { sent: false, error: "Missing ADMIN_EMAIL" } });
	const response = await POST(contactRequest());
	assert.equal(response.status, 200);
	assert.equal((await response.json()).ok, true);
	assert.deepEqual(calls, ["save", "notify"]);
});

test("contact form also saves and notifies without browser JavaScript", async () => {
	const { POST, calls } = await loadSubmission();
	const response = await POST(contactRequest({}, false));
	assert.equal(response.status, 302);
	assert.equal(response.headers.get("Location"), "https://ibuycarkeys.com/contact/?submitted=true");
	assert.deepEqual(calls, ["save", "notify"]);
});
