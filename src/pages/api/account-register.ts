import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createMutableRedirect, setAccountSessionCookies } from "~/lib/accountAuth";

export const prerender = false;

const getEnv = (key: string) => globalThis.process?.env?.[key]?.trim() ?? import.meta.env[key]?.trim?.() ?? "";

export const POST: APIRoute = async ({ cookies, request, url }) => {
	const formData = await request.formData();
	const fullName = formData.get("fullName")?.toString().trim() ?? "";
	const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
	const password = formData.get("password")?.toString() ?? "";
	const phoneNumber = formData.get("phoneNumber")?.toString().trim() ?? "";
	const mailingAddress = formData.get("mailingAddress")?.toString().trim() ?? "";
	const city = formData.get("city")?.toString().trim() ?? "";
	const state = formData.get("state")?.toString().trim().toUpperCase() ?? "";
	const zipCode = formData.get("zipCode")?.toString().trim() ?? "";
	const requestedReturnTo = formData.get("returnTo")?.toString() ?? "/account/";
	const returnTo = requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//") ? requestedReturnTo : "/account/";

	if (!fullName || !email || password.length < 8 || !phoneNumber || !mailingAddress || !city || state.length !== 2 || !/^\d{5}$/.test(zipCode)) {
		return Response.redirect(new URL("/register/?error=invalid", url), 302);
	}

	const authClient = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"), {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	const { data, error } = await authClient.auth.signUp({
		email,
		password,
		options: {
			data: {
				full_name: fullName,
				phone_number: phoneNumber,
				mailing_address: mailingAddress,
				city,
				state,
				zip_code: zipCode,
			},
			emailRedirectTo: new URL(`/login/?confirmed=true&returnTo=${encodeURIComponent(returnTo)}`, url).toString(),
		},
	});

	if (error) {
		const destination = new URL("/register/", url);
		destination.searchParams.set("error", error.message.toLowerCase().includes("registered") ? "exists" : "signup");
		return Response.redirect(destination, 302);
	}

	if (data.session) {
		setAccountSessionCookies(cookies, data.session, url.protocol === "https:");
		return createMutableRedirect(returnTo);
	}

	return Response.redirect(new URL(`/login/?registered=true&returnTo=${encodeURIComponent(returnTo)}`, url), 302);
};
