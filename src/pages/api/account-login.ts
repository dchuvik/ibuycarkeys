import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { setAccountSessionCookies } from "~/lib/accountAuth";

export const prerender = false;

const getEnv = (key: string) => globalThis.process?.env?.[key]?.trim() ?? import.meta.env[key]?.trim?.() ?? "";

export const GET: APIRoute = ({ url }) => Response.redirect(new URL("/login/", url), 302);

export const POST: APIRoute = async ({ cookies, request, url }) => {
	const formData = await request.formData();
	const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
	const password = formData.get("password")?.toString() ?? "";
	const requestedReturnTo = formData.get("returnTo")?.toString() ?? "/account/";
	const returnTo = requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//") ? requestedReturnTo : "/account/";
	const authClient = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"), {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	const { data, error } = await authClient.auth.signInWithPassword({ email, password });

	if (error || !data.session) {
		const destination = new URL("/login/", url);
		destination.searchParams.set("error", "invalid");
		destination.searchParams.set("returnTo", returnTo);
		return Response.redirect(destination, 302);
	}

	setAccountSessionCookies(cookies, data.session, url.protocol === "https:");
	return Response.redirect(new URL(returnTo, url), 302);
};
