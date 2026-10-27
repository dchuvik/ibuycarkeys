import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const id = "11111111-1111-4111-8111-111111111111";
const request = (payload = { id }, options = {}) => ({
	cookies: {}, url: new URL("https://ibuycarkeys.com/api/admin-quote-delete"),
	request: new Request("https://ibuycarkeys.com/api/admin-quote-delete", {
		method: "POST", headers: { "Content-Type": "application/json", ...options.headers },
		body: options.rawBody ?? JSON.stringify(payload),
	}),
});

const loadDelete = async (options = {}) => {
	const calls = [];
	const { POST } = await loadModule("src/pages/api/admin-quote-delete.ts", { mocks: {
		"~/lib/accountAuth": { isAdminAccount: async () => options.authorized ?? true },
		"~/lib/supabaseAdmin": {
			isSupabaseAdminConfigured: () => options.configured ?? true,
			getSupabaseAdmin: () => ({ from: (table) => {
				calls.push(["table", table]);
				return { delete: () => ({ eq: (column, value) => {
					calls.push(["delete", column, value]);
					return { select: async (columns) => {
						assert.equal(columns, "id");
						if (options.throws) throw new Error("Database unavailable");
						return { data: Object.hasOwn(options, "data") ? options.data : [{ id }], error: options.error ?? null };
					} };
				} }) };
			} }),
		},
	} });
	return { POST, calls };
};

test("quote deletion requires a signed-in admin and never accesses the database otherwise", async () => {
	const { POST, calls } = await loadDelete({ authorized: false });
	assert.equal((await POST(request())).status, 401);
	assert.deepEqual(calls, []);
});

test("quote deletion rejects cross-origin and non-JSON requests before database access", async () => {
	const { POST, calls } = await loadDelete();
	assert.equal((await POST(request({ id }, { headers: { Origin: "https://other.example" } }))).status, 403);
	assert.equal((await POST(request({ id }, { headers: { "Content-Type": "text/plain" } }))).status, 415);
	assert.deepEqual(calls, []);
});

test("unconfigured quote deletion returns an error without database access", async () => {
	const { POST, calls } = await loadDelete({ configured: false });
	assert.equal((await POST(request())).status, 500);
	assert.deepEqual(calls, []);
});

test("invalid deletion IDs and malformed JSON can never become a bulk delete", async () => {
	const { POST, calls } = await loadDelete();
	for (const payload of [null, {}, [], { id: 123 }, { id: "" }, { id: " " }, { id: "bad" }, { id: [id] }, { ids: [id] }, { id: `${id},another-id` }]) {
		assert.equal((await POST(request(payload))).status, 400);
	}
	assert.equal((await POST(request({}, { rawBody: "not-json" }))).status, 400);
	assert.deepEqual(calls, []);
});

test("quote deletion targets only the chosen quote and confirms the ID", async () => {
	const { POST, calls } = await loadDelete();
	const response = await POST(request({ id: ` ${id} `, table: "profiles", filter: "all" }, { headers: { Origin: "https://ibuycarkeys.com" } }));
	assert.equal(response.status, 200);
	assert.deepEqual(await response.json(), { ok: true, id });
	assert.deepEqual(calls, [["table", "quote_requests"], ["delete", "id", id]]);
});

test("missing quotes do not falsely report a successful deletion", async () => {
	for (const data of [[], null]) {
		const { POST } = await loadDelete({ data });
		const response = await POST(request());
		assert.equal(response.status, 404);
		assert.equal((await response.json()).ok, false);
	}
});

test("database failures report deletion failure without exposing internal details", async () => {
	for (const options of [{ error: { message: "private database details" } }, { throws: true }]) {
		const { POST } = await loadDelete(options);
		const response = await POST(request());
		assert.equal(response.status, 500);
		assert.deepEqual(await response.json(), { ok: false, error: "Could not delete quote" });
	}
});
