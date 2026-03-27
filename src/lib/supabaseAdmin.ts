import { createClient } from "@supabase/supabase-js";

const getServiceRoleKey = () => import.meta.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

export const isSupabaseAdminConfigured = () => Boolean(getServiceRoleKey());

export const getSupabaseAdmin = () => {
	const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
	const serviceRoleKey = getServiceRoleKey();

	if (!supabaseUrl) {
		throw new Error("Missing PUBLIC_SUPABASE_URL.");
	}

	if (!serviceRoleKey) {
		throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
	}

	return createClient(supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
};
