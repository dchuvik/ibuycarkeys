import type { APIRoute } from "astro";
import { adminSessionCookieName } from "~/lib/adminAuth";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, url }) => {
	cookies.delete(adminSessionCookieName, {
		path: "/",
	});

	return Response.redirect(new URL("/admin/", url), 302);
};
