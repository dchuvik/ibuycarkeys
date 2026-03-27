import type { APIRoute } from "astro";
import { adminSessionCookieName } from "~/lib/adminAuth";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, url }) => {
	const redirectTo = (pathname: string) =>
		new Response(null, {
			status: 302,
			headers: {
				Location: new URL(pathname, url).toString(),
			},
		});

	cookies.delete(adminSessionCookieName, {
		path: "/",
	});

	return redirectTo("/admin/");
};
