import type { APIRoute } from "astro";
import { getAccountUser } from "~/lib/accountAuth";
import { getSupabaseAdmin } from "~/lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request, url }) => {
	const user = await getAccountUser(cookies, url.protocol === "https:");
	if (!user) {
		return Response.redirect(new URL("/login/?returnTo=/account/", url), 302);
	}

	const formData = await request.formData();
	const fullName = formData.get("fullName")?.toString().trim() ?? "";
	const phoneNumber = formData.get("phoneNumber")?.toString().trim() ?? "";
	const mailingAddress = formData.get("mailingAddress")?.toString().trim() ?? "";
	const city = formData.get("city")?.toString().trim() ?? "";
	const state = formData.get("state")?.toString().trim().toUpperCase() ?? "";
	const zipCode = formData.get("zipCode")?.toString().trim() ?? "";

	if (!fullName || !phoneNumber || !mailingAddress || !city || !/^[A-Z]{2}$/.test(state) || !/^\d{5}$/.test(zipCode)) {
		return Response.redirect(new URL("/account/?profile=error", url), 302);
	}

	const { error } = await getSupabaseAdmin()
		.from("profiles")
		.update({
			full_name: fullName,
			phone_number: phoneNumber,
			mailing_address: mailingAddress,
			city,
			state,
			zip_code: zipCode,
		})
		.eq("id", user.id);

	return Response.redirect(new URL(error ? "/account/?profile=error" : "/account/?profile=updated", url), 302);
};
