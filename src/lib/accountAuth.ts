import type { AstroCookies } from "astro";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "~/lib/supabaseAdmin";

export const accountAccessCookieName = "ibuycarkeys_access_token";
export const accountRefreshCookieName = "ibuycarkeys_refresh_token";

const getEnv = (key: string) => globalThis.process?.env?.[key]?.trim() ?? import.meta.env[key]?.trim?.() ?? "";

const getAuthClient = () =>
	createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"), {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});

const cookieOptions = (secure: boolean) => ({
	httpOnly: true,
	path: "/",
	sameSite: "lax" as const,
	secure,
});

export const setAccountSessionCookies = (
	cookies: AstroCookies,
	session: { access_token: string; refresh_token: string; expires_in?: number },
	secure: boolean,
) => {
	cookies.set(accountAccessCookieName, session.access_token, {
		...cookieOptions(secure),
		maxAge: session.expires_in ?? 60 * 60,
	});
	cookies.set(accountRefreshCookieName, session.refresh_token, {
		...cookieOptions(secure),
		maxAge: 60 * 60 * 24 * 30,
	});
};

export const clearAccountSessionCookies = (cookies: AstroCookies) => {
	cookies.delete(accountAccessCookieName, { path: "/" });
	cookies.delete(accountRefreshCookieName, { path: "/" });
};

export const getAccountUser = async (
	cookies: AstroCookies,
	secure = false,
): Promise<User | null> => {
	const accessToken = cookies.get(accountAccessCookieName)?.value;
	const refreshToken = cookies.get(accountRefreshCookieName)?.value;
	const authClient = getAuthClient();

	if (accessToken) {
		const { data } = await authClient.auth.getUser(accessToken);
		if (data.user) {
			return data.user;
		}
	}

	if (!refreshToken) {
		return null;
	}

	const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken });
	if (error || !data.session || !data.user) {
		clearAccountSessionCookies(cookies);
		return null;
	}

	setAccountSessionCookies(cookies, data.session, secure);
	return data.user;
};

export const getAccountRole = async (userId: string) => {
	const { data } = await getSupabaseAdmin().from("profiles").select("role").eq("id", userId).maybeSingle();
	return data?.role === "admin" ? "admin" : "customer";
};

export const isAdminAccount = async (cookies: AstroCookies, secure = false) => {
	const user = await getAccountUser(cookies, secure);
	return Boolean(user && (await getAccountRole(user.id)) === "admin");
};
