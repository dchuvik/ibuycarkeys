import type { APIRoute } from "astro";
import {
	adminSessionCookieName,
	createAdminSessionToken,
	isAdminPasswordConfigured,
	isValidAdminPassword,
} from "~/lib/adminAuth";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request, url }) => {
	const formData = await request.formData();
	const password = formData.get("password")?.toString() ?? "";

	const redirectTo = (pathname: string) =>
		new Response(null, {
			status: 302,
			headers: {
				Location: new URL(pathname, url).toString(),
			},
		});

	if (!isAdminPasswordConfigured()) {
		return redirectTo("/admin/?error=setup");
	}

	if (!isValidAdminPassword(password)) {
		return redirectTo("/admin/?error=invalid");
	}

	cookies.set(adminSessionCookieName, createAdminSessionToken(), {
		httpOnly: true,
		path: "/",
		sameSite: "lax",
		secure: url.protocol === "https:",
		maxAge: 60 * 60 * 12,
	});

	return redirectTo("/admin/");
};
