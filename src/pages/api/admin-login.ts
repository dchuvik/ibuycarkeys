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

	if (!isAdminPasswordConfigured()) {
		return Response.redirect(new URL("/admin/?error=setup", url), 302);
	}

	if (!isValidAdminPassword(password)) {
		return Response.redirect(new URL("/admin/?error=invalid", url), 302);
	}

	cookies.set(adminSessionCookieName, createAdminSessionToken(), {
		httpOnly: true,
		path: "/",
		sameSite: "lax",
		secure: url.protocol === "https:",
		maxAge: 60 * 60 * 12,
	});

	return Response.redirect(new URL("/admin/", url), 302);
};
