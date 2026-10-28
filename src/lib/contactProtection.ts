import { getSecret } from "astro:env/server";

// Read at request time so Netlify's Functions environment is the source of truth.
export const getContactProtection = () => {
	const siteKey = getSecret("TURNSTILE_SITE_KEY")?.trim() ?? "";
	const secretKey = getSecret("TURNSTILE_SECRET_KEY")?.trim() ?? "";
	return {
		siteKey,
		enabled: Boolean(siteKey || secretKey),
		configured: Boolean(siteKey && secretKey),
	};
};

type VerificationResult = { ok: true } | { ok: false; status: number; error: string };
const unavailable = (): VerificationResult => ({
	ok: false,
	status: 503,
	error: "The security check is temporarily unavailable. Please try again shortly.",
});
const invalid = (): VerificationResult => ({
	ok: false,
	status: 400,
	error: "Please complete the security check and send your message again.",
});

export const verifyContactChallenge = async (token: string, hostname: string): Promise<VerificationResult> => {
	const protection = getContactProtection();
	// Existing installations remain usable until keys are added. A partial setup never bypasses verification.
	if (!protection.enabled) return { ok: true };
	if (!protection.configured) return unavailable();
	if (!token || token.length > 2048) return invalid();

	try {
		const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				secret: getSecret("TURNSTILE_SECRET_KEY")!.trim(),
				response: token,
			}),
			signal: AbortSignal.timeout(8_000),
		});
		if (!response.ok) return unavailable();
		const result = await response.json();
		if (result?.success !== true) {
			const codes = Array.isArray(result?.["error-codes"]) ? result["error-codes"] : [];
			return codes.some((code: string) => ["missing-input-secret", "invalid-input-secret", "internal-error"].includes(code))
				? unavailable() : invalid();
		}
		// A token for another host or another form is not a valid contact submission.
		if (result.hostname !== hostname || result.action !== "contact") return invalid();
		return { ok: true };
	} catch {
		return unavailable();
	}
};
