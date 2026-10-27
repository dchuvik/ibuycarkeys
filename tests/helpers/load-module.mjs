import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { build } from "esbuild";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(import.meta.url);
const builds = new Map();

// Compile the real server modules, replacing only external services. Never load .env or send mail.
export const loadModule = async (entry, { mocks = {}, fetch, console: logger } = {}) => {
	const key = JSON.stringify([entry, Object.keys(mocks).sort()]);
	if (!builds.has(key)) {
		builds.set(key, build({
			absWorkingDir: projectRoot,
			entryPoints: [entry],
			bundle: true,
			write: false,
			platform: "node",
			format: "cjs",
			target: "node20",
			external: ["jspdf"],
			define: { "import.meta.env": "{}" },
			plugins: [{
				name: "test-service-mocks",
				setup(builder) {
					builder.onResolve({ filter: /.*/ }, ({ path }) =>
						Object.hasOwn(mocks, path) ? { path, namespace: "mock" } : undefined);
					builder.onLoad({ filter: /.*/, namespace: "mock" }, ({ path }) => ({
						contents: `module.exports = globalThis.__moduleMocks[${JSON.stringify(path)}];`,
					}));
				},
			}],
		}).then((result) => result.outputFiles[0].text));
	}
	const context = {
		module: { exports: {} },
		require,
		__moduleMocks: mocks,
		fetch: fetch ?? (() => { throw new Error("Unexpected network request in test"); }),
		console: logger ?? { warn() {}, error() {}, log() {} },
		Response,
		Request,
		URL,
		URLSearchParams,
		FormData,
		AbortSignal,
	};
	vm.runInNewContext(await builds.get(key), context);
	return context.module.exports;
};
