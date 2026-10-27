export type ToastKind = "loading" | "success" | "error" | "warning" | "info";
type ToastOptions = { id?: string; kind?: ToastKind; duration?: number };
type ToastEntry = {
	element: HTMLElement;
	message: HTMLElement;
	title: HTMLElement;
	icon: HTMLElement;
	timer?: number;
	remaining: number;
	started: number;
	trigger: HTMLElement | null;
};

const entries = new Map<string, ToastEntry>();
const boundForms = new WeakSet<HTMLFormElement>();
const labels: Record<ToastKind, [string, string]> = {
	loading: ["In progress", ""], success: ["Done", "✓"], error: ["Something went wrong", "!"],
	warning: ["Please check", "!"], info: ["Update", "i"],
};
let nextId = 0;

export const dismissToast = (id: string) => {
	const entry = entries.get(id);
	if (!entry) return;
	window.clearTimeout(entry.timer);
	const restoreFocus = entry.element.contains(document.activeElement);
	entry.element.remove();
	entries.delete(id);
	if (restoreFocus && entry.trigger?.isConnected) entry.trigger.focus({ preventScroll: true });
};

const pause = (entry: ToastEntry) => {
	if (entry.timer === undefined) return;
	window.clearTimeout(entry.timer);
	entry.timer = undefined;
	entry.remaining = Math.max(0, entry.remaining - (Date.now() - entry.started));
};

const resume = (id: string, entry: ToastEntry) => {
	if (entries.get(id) !== entry || !entry.element.isConnected || !entry.remaining || entry.element.matches(":hover, :focus-within")) return;
	window.clearTimeout(entry.timer);
	entry.started = Date.now();
	entry.timer = window.setTimeout(() => dismissToast(id), entry.remaining);
};

export const showToast = (message: string, { id = `toast-${++nextId}`, kind = "success", duration }: ToastOptions = {}) => {
	const host = document.getElementById("site-toast-list");
	if (!host || !message.trim()) return id;
	let entry = entries.get(id);
	if (entry && !entry.element.isConnected) {
		dismissToast(id);
		entry = undefined;
	}
	if (!entry) {
		const element = document.createElement("div");
		element.className = "site-toast";
		element.dataset.toastId = id;
		const icon = document.createElement("span");
		icon.className = "site-toast__icon";
		icon.setAttribute("aria-hidden", "true");
		const content = document.createElement("div");
		content.className = "site-toast__content";
		const title = document.createElement("strong");
		title.className = "site-toast__title";
		const text = document.createElement("p");
		text.className = "site-toast__message";
		content.append(title, text);
		const close = document.createElement("button");
		close.type = "button";
		close.className = "site-toast__close";
		close.setAttribute("aria-label", "Dismiss notification");
		close.textContent = "×";
		close.addEventListener("click", () => dismissToast(id));
		element.append(icon, content, close);
		entry = { element, message: text, title, icon, remaining: 0, started: 0,
			trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null };
		const current = entry;
		element.addEventListener("pointerenter", () => pause(current));
		element.addEventListener("pointerleave", () => resume(id, current));
		element.addEventListener("focusin", () => pause(current));
		element.addEventListener("focusout", () => { window.setTimeout(() => resume(id, current), 0); });
		entries.set(id, entry);
		host.prepend(element);
	}
	window.clearTimeout(entry.timer);
	if (!entry.element.matches(":focus-within") && host.firstElementChild !== entry.element) host.prepend(entry.element);
	host.scrollTop = 0;
	entry.timer = undefined;
	entry.element.dataset.kind = kind;
	entry.title.textContent = labels[kind][0];
	entry.icon.textContent = labels[kind][1];
	entry.message.textContent = message;
	entry.remaining = duration ?? (kind === "success" || kind === "info" ? 8000 : 0);
	resume(id, entry);
	const announcement = document.getElementById(kind === "error" ? "site-toast-alert" : "site-toast-status");
	if (announcement) {
		announcement.textContent = "";
		window.requestAnimationFrame(() => { announcement.textContent = `${labels[kind][0]}. ${message}`; });
	}
	return id;
};

export const initializeToasts = () => {
	const url = new URL(window.location.href);
	for (const notice of document.querySelectorAll<HTMLElement>("[data-toast-on-load]:not([data-toast-shown])")) {
		notice.dataset.toastShown = "true";
		const kind = notice.dataset.toastKind ?? "info";
		showToast(notice.textContent?.trim() ?? "", {
			kind: Object.hasOwn(labels, kind) ? kind as ToastKind : "info", id: notice.dataset.toastId ?? "form-feedback",
		});
		for (const key of (notice.dataset.toastParams ?? "").split(" ").filter(Boolean)) url.searchParams.delete(key);
	}
	if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
	for (const form of document.querySelectorAll<HTMLFormElement>("form[data-progress-message]")) {
		if (boundForms.has(form)) continue;
		boundForms.add(form);
		form.addEventListener("submit", (event) => {
			if (event.defaultPrevented) return;
			if (form.dataset.feedbackPending === "true") { event.preventDefault(); return; }
			form.dataset.feedbackPending = "true";
			showToast(form.dataset.progressMessage ?? "Working...", { id: "form-feedback", kind: "loading" });
		});
	}
};

export const restoreToastForms = () => {
	document.querySelectorAll<HTMLElement>("[data-feedback-pending]").forEach((form) => { delete form.dataset.feedbackPending; });
	for (const [id, entry] of entries) if (entry.element.dataset.kind === "loading") dismissToast(id);
};
