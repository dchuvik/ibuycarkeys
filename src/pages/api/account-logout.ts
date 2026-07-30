import type { APIRoute } from "astro";
import { accountAccessCookieName, clearAccountSessionCookies } from "~/lib/accountAuth";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;

const getEnv = (key: string) => globalThis.process?.env?.[key]?.trim() ?? import.meta.env[key]?.trim?.() ?? "";

export const POST: APIRoute = async ({ cookies, url }) => {
	const accessToken = cookies.get(accountAccessCookieName)?.value;
	if (accessToken) {
		const authClient = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"), {
			global: { headers: { Authorization: `Bearer ${accessToken}` } },
			auth: { autoRefreshToken: false, persistSession: false },
		});
		await authClient.auth.signOut({ scope: "local" });
	}
	clearAccountSessionCookies(cookies);
	return Response.redirect(new URL("/", url), 302);
};
