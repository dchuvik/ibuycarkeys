type TurnstileApi = {
	ready: (callback: () => void) => void;
	render: (container: HTMLElement, options: Record<string, unknown>) => string;
	reset: (widget: string) => void;
	remove: (widget: string) => void;
};

declare global {
	interface Window { turnstile?: TurnstileApi }
}

let loading: Promise<TurnstileApi> | undefined;
const loadTurnstile = (): Promise<TurnstileApi> => {
	if (window.turnstile) return new Promise((resolve) => window.turnstile!.ready(() => resolve(window.turnstile!)));
	if (loading) return loading;
	loading = new Promise<TurnstileApi>((resolve, reject) => {
		const script = document.createElement("script");
		script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
		script.async = true;
		const timeout = window.setTimeout(() => fail(), 15_000);
		const fail = () => {
			window.clearTimeout(timeout);
			script.remove();
			reject(new Error("Security check could not load."));
		};
		script.onerror = fail;
		script.onload = () => {
			if (!window.turnstile) return fail();
			window.turnstile.ready(() => {
				window.clearTimeout(timeout);
				resolve(window.turnstile!);
			});
		};
		document.head.append(script);
	}).catch((error) => { loading = undefined; throw error; });
	return loading;
};

export const mountContactChallenge = (container: HTMLElement, status: HTMLElement | null) => {
	let api: TurnstileApi | undefined;
	let widget: string | undefined;
	let token = "";
	let destroyed = false;
	const update = (message: string) => { if (!destroyed && status) status.textContent = message; };
	const reset = () => {
		token = "";
		if (widget !== undefined && api && !destroyed) {
			update("Checking your browser...");
			api.reset(widget);
		}
	};
	void loadTurnstile().then((loaded) => {
		if (destroyed || !container.isConnected) return;
		api = loaded;
		widget = api.render(container, {
			sitekey: container.dataset.sitekey,
			action: "contact",
			theme: "light",
			size: "flexible",
			callback: (response: string) => { token = response; update("Security check complete."); },
			"expired-callback": () => { token = ""; update("Please complete the security check again."); },
			"error-callback": () => { token = ""; update("The security check failed. Please retry the check or refresh this page."); },
			"timeout-callback": () => { token = ""; update("The security check timed out. Please retry the check."); },
		});
	}).catch(() => update("The security check could not load. Refresh this page and allow the check in your browser to try again."));
	return {
		isComplete: () => Boolean(token),
		reset,
		destroy: () => {
			destroyed = true;
			token = "";
			if (widget !== undefined && api) api.remove(widget);
		},
	};
};
