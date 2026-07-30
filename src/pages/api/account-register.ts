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

	if (!fullName || !email || password.length < 8) {
		return Response.redirect(new URL("/register/?error=invalid", url), 302);
	}

	const authClient = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"), {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	const { data, error } = await authClient.auth.signUp({
		email,
		password,
		options: {
			data: { full_name: fullName },
			emailRedirectTo: new URL("/login/?confirmed=true", url).toString(),
		},
	});

	if (error) {
		const destination = new URL("/register/", url);
		destination.searchParams.set("error", error.message.toLowerCase().includes("registered") ? "exists" : "signup");
		return Response.redirect(destination, 302);
	}

	if (data.session) {
		setAccountSessionCookies(cookies, data.session, url.protocol === "https:");
		return createMutableRedirect("/account/");
	}

	return Response.redirect(new URL("/login/?registered=true", url), 302);
};
