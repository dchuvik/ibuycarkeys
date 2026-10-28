import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const keys = { TURNSTILE_SITE_KEY: "public-site-key", TURNSTILE_SECRET_KEY: "private-server-key" };
const valid = { success: true, hostname: "ibuycarkeys.com", action: "contact" };
const request = (token = "browser-token", acceptsJson = true, extra = {}) => ({
	request: new Request("https://ibuycarkeys.com/api/contact-request.json", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded", ...(acceptsJson ? { Accept: "application/json" } : {}) },
		body: new URLSearchParams({ "first-name": "Customer", "last-name": "Example", email: "customer@example.com", message: "Can I sell my keys?", "cf-turnstile-response": token, ...extra }),
	}),
});
const load = async ({ env = keys, result = valid, networkError = false, status = 200, saveError = null } = {}) => {
	const calls = [];
	const module = await loadModule("src/pages/api/contact-request.json.ts", {
		mocks: {
			"astro:env/server": { getSecret: (key) => env[key] },
			"~/lib/supabase": { supabase: { from: () => ({ insert: async () => { calls.push("save"); return { error: saveError }; } }) } },
			"~/lib/contactEmails": { sendContactNotificationEmail: async () => { calls.push("notify"); return { sent: true }; } },
		},
		fetch: async (url, options) => {
			calls.push("verify");
			assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
			assert.equal(options.method, "POST");
			assert.equal(options.body.get("secret"), keys.TURNSTILE_SECRET_KEY);
			assert.equal(options.body.get("response"), "browser-token");
			assert.ok(options.signal);
			if (networkError) throw new Error("Network unavailable");
			return new Response(typeof result === "string" ? result : JSON.stringify(result), { status });
		},
	});
	return { ...module, calls };
};

test("Turnstile verifies on the server before saving or notifying", async () => {
	const { POST, calls } = await load();
	assert.equal((await POST(request())).status, 200);
	assert.deepEqual(calls, ["verify", "save", "notify"]);
});

test("missing and oversized tokens cannot bypass an enabled challenge", async () => {
	const { POST, calls } = await load();
	for (const token of ["", "x".repeat(2049)]) {
		const response = await POST(request(token));
		assert.equal(response.status, 400);
		assert.equal((await response.json()).ok, false);
	}
	assert.deepEqual(calls, []);
});

test("failed, expired, replayed, wrong-host, and wrong-action challenges never save or send", async () => {
	for (const result of [
		{ success: false, "error-codes": ["invalid-input-response"] },
		{ success: false, "error-codes": ["timeout-or-duplicate"] },
		{ ...valid, hostname: "attacker.example" },
		{ ...valid, action: "login" },
		{ success: true },
		{ ...valid, success: "true" },
		null,
	]) {
		const { POST, calls } = await load({ result });
		assert.equal((await POST(request())).status, 400);
		assert.deepEqual(calls, ["verify"]);
	}
});

test("partial configuration fails closed while no keys preserve existing installations", async () => {
	for (const env of [{ TURNSTILE_SITE_KEY: keys.TURNSTILE_SITE_KEY }, { TURNSTILE_SECRET_KEY: keys.TURNSTILE_SECRET_KEY }]) {
		const { POST, calls } = await load({ env });
		assert.equal((await POST(request())).status, 503);
		assert.deepEqual(calls, []);
	}
	const { POST, calls } = await load({ env: {} });
	assert.equal((await POST(request(""))).status, 200);
	assert.deepEqual(calls, ["save", "notify"]);
});

test("Cloudflare outages, malformed responses, and invalid secrets fail without saving or exposing secrets", async () => {
	for (const options of [
		{ networkError: true }, { status: 503 }, { result: "not-json" },
		{ result: { success: false, "error-codes": ["invalid-input-secret"] } },
		{ result: { success: false, "error-codes": ["internal-error"] } },
	]) {
		const { POST, calls } = await load(options);
		const response = await POST(request());
		assert.equal(response.status, 503);
		assert.doesNotMatch(await response.text(), /private-server-key|browser-token/);
		assert.deepEqual(calls, ["verify"]);
	}
});

test("honeypots and invalid text fields still stop submissions before challenge verification", async () => {
	const { POST, calls } = await load();
	assert.equal((await POST(request("browser-token", true, { "bot-field": "bot" }))).status, 200);
	assert.equal((await POST(request("browser-token", true, { email: "invalid" }))).status, 400);
	assert.deepEqual(calls, []);
});

test("challenge failures redirect native submissions without claiming success", async () => {
	const { POST, calls } = await load();
	const response = await POST(request("", false));
	assert.equal(response.status, 302);
	assert.equal(response.headers.get("Location"), "https://ibuycarkeys.com/contact/?error=security-check");
	assert.deepEqual(calls, []);
});

test("a failed save after verification does not send an alert", async () => {
	const { POST, calls } = await load({ saveError: {} });
	assert.equal((await POST(request())).status, 500);
	assert.deepEqual(calls, ["verify", "save"]);
});
