import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const makeCookies = (initial = {}) => {
	const values = new Map(Object.entries(initial));
	const calls = [];
	return { calls, values,
		get: (name) => values.has(name) ? { value: values.get(name) } : undefined,
		set: (name, value, options) => { values.set(name, value); calls.push(["set", name, options]); },
		delete: (name, options) => { values.delete(name); calls.push(["delete", name, options]); },
	};
};
const context = (cookies, fields = {}) => ({ cookies, url: new URL("https://ibuycarkeys.com/api/account"),
	request: new Request("https://ibuycarkeys.com/api/account", { method: "POST", body: new URLSearchParams(fields) }) });
const loadAccount = async (action, result = {}) => {
	const { POST } = await loadModule(`src/pages/api/account-${action}.ts`, { mocks: {
		"@supabase/supabase-js": { createClient: () => ({ auth: {
			signInWithPassword: async () => result,
			signUp: async () => result,
			signOut: async () => ({ error: null }),
		} }) },
		"~/lib/accountAuth": {
			accountAccessCookieName: "access",
			clearAccountSessionCookies: (cookies) => cookies.delete("access"),
			setAccountSessionCookies: (cookies) => cookies.set("access", "test-session", {}),
			getAccountRole: async () => "admin",
			createMutableRedirect: (location) => new Response(null, { status: 302, headers: { Location: location } }),
		},
	} });
	return POST;
};

test("action feedback is short-lived, secure, consumed once, and rejects unknown codes", async () => {
	const { setActionFeedback, consumeActionFeedback } = await loadModule("src/lib/actionFeedback.ts");
	const cookies = makeCookies();
	setActionFeedback(cookies, "signed-in", true);
	assert.equal(cookies.calls[0][2].httpOnly, true);
	assert.equal(cookies.calls[0][2].secure, true);
	assert.equal(cookies.calls[0][2].sameSite, "lax");
	assert.equal(cookies.calls[0][2].maxAge, 60);
	assert.ok(consumeActionFeedback(cookies));
	assert.equal(consumeActionFeedback(cookies), "");
	for (const code of ["<script>bad</script>", "__proto__"]) {
		const unknown = makeCookies({ ibuycarkeys_feedback: code });
		assert.equal(consumeActionFeedback(unknown), "");
		assert.equal(unknown.values.size, 0);
	}
});

test("sign-in success feedback is set only after a session is established", async () => {
	const cookies = makeCookies();
	const POST = await loadAccount("login", { data: { session: {}, user: { id: "example" } }, error: null });
	const response = await POST(context(cookies, { email: "admin@example.invalid", password: "test-password" }));
	assert.equal(response.status, 302);
	assert.equal(response.headers.get("Location"), "/admin/");
	assert.equal(cookies.values.get("ibuycarkeys_feedback"), "signed-in");
	assert.deepEqual(cookies.calls.map((call) => call[1]), ["access", "ibuycarkeys_feedback"]);
});

test("failed sign-in never claims success", async () => {
	const cookies = makeCookies();
	const POST = await loadAccount("login", { data: {}, error: {} });
	const response = await POST(context(cookies));
	assert.match(response.headers.get("Location"), /error=invalid/);
	assert.equal(cookies.values.has("ibuycarkeys_feedback"), false);
});

const registration = { fullName: "Example Customer", email: "customer@example.invalid", password: "test-password",
	phoneNumber: "555-0100", mailingAddress: "123 Example Street", city: "Albany", state: "NY", zipCode: "12207" };
test("registration distinguishes a signed-in account from pending email verification", async () => {
	for (const session of [{}, null]) {
		const cookies = makeCookies();
		const POST = await loadAccount("register", { data: { session }, error: null });
		const response = await POST(context(cookies, registration));
		assert.equal(response.status, 302);
		assert.equal(cookies.values.get("ibuycarkeys_feedback"), session ? "account-created" : undefined);
		if (!session) assert.match(response.headers.get("Location"), /registered=true/);
	}
});

test("failed registration never claims an account was created", async () => {
	const cookies = makeCookies();
	const POST = await loadAccount("register", { error: { message: "Account already registered" } });
	const response = await POST(context(cookies, registration));
	assert.match(response.headers.get("Location"), /error=exists/);
	assert.equal(cookies.values.has("ibuycarkeys_feedback"), false);
});

test("sign-out clears the local session before setting confirmation feedback", async () => {
	const cookies = makeCookies({ access: "test-session" });
	const POST = await loadAccount("logout");
	assert.equal((await POST(context(cookies))).headers.get("Location"), "/");
	assert.equal(cookies.values.has("access"), false);
	assert.equal(cookies.values.get("ibuycarkeys_feedback"), "signed-out");
	assert.deepEqual(cookies.calls.map((call) => call[0]), ["delete", "set"]);
});
