import assert from "node:assert/strict";
import test from "node:test";
import { loadModule } from "./helpers/load-module.mjs";

const fixture = async ({ preloaded = false, fail = false, delayed = false } = {}) => {
	const calls = [];
	let options, finish;
	const container = { isConnected: true, dataset: { sitekey: "public-site-key" } };
	const status = { textContent: "Checking your browser..." };
	const api = {
		// The real Cloudflare API rejects ready() when its script is async.
		ready() { throw new Error("Cannot use ready() with async Turnstile"); },
		render(element, config) { assert.equal(element, container); options = config; calls.push("render"); return "widget-1"; },
		reset(widget) { assert.equal(widget, "widget-1"); calls.push("reset"); },
		remove(widget) { assert.equal(widget, "widget-1"); calls.push("remove"); },
	};
	const window = { setTimeout: () => 1, clearTimeout() {}, ...(preloaded ? { turnstile: api } : {}) };
	const document = {
		createElement: () => ({ remove() { calls.push("remove-script"); } }),
		head: { append(script) {
			assert.equal(script.async, true);
			const url = new URL(script.src);
			assert.equal(url.origin, "https://challenges.cloudflare.com");
			assert.equal(url.searchParams.get("render"), "explicit");
			const callback = url.searchParams.get("onload");
			assert.ok(callback, "Async loading must use Cloudflare's documented onload callback");
			finish = () => {
				if (fail) return script.onerror();
				window.turnstile = api;
				window[callback]();
			};
			if (!delayed) finish();
		} },
	};
	const { mountContactChallenge } = await loadModule("src/lib/contactChallenge.ts", { globals: { window, document } });
	const challenge = mountContactChallenge(container, status);
	const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
	await settle();
	return { challenge, container, status, calls, options, finish, settle };
};

test("async Turnstile loads through its callback and never calls synchronous-only ready()", async () => {
	const { challenge, calls, options, status } = await fixture();
	assert.deepEqual(calls, ["render"]);
	assert.equal(options.action, "contact");
	assert.equal(challenge.isComplete(), false);
	options.callback("fresh-token");
	assert.equal(challenge.isComplete(), true);
	assert.match(status.textContent, /complete/);
	challenge.reset();
	assert.equal(challenge.isComplete(), false);
	assert.deepEqual(calls, ["render", "reset"]);
});

test("a previously loaded Turnstile API is reused without ready() or another script", async () => {
	const { challenge, calls, options } = await fixture({ preloaded: true });
	assert.deepEqual(calls, ["render"]);
	options.callback("token");
	options["expired-callback"]();
	assert.equal(challenge.isComplete(), false);
	challenge.destroy();
	assert.deepEqual(calls, ["render", "remove"]);
});

test("a blocked script reports a recoverable error and never completes the challenge", async () => {
	const { challenge, calls, status } = await fixture({ fail: true });
	assert.equal(challenge.isComplete(), false);
	assert.match(status.textContent, /could not load/);
	assert.deepEqual(calls, ["remove-script"]);
});

test("navigation before the API loads cannot render a detached challenge", async () => {
	const { challenge, calls, finish, settle } = await fixture({ delayed: true });
	challenge.destroy();
	finish();
	await settle();
	assert.deepEqual(calls, []);
});
