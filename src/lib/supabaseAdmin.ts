import { createClient } from "@supabase/supabase-js";

const getEnv = (key: string) => globalThis.process?.env?.[key]?.trim() ?? "";

const getServiceRoleKey = () => getEnv("SUPABASE_SERVICE_ROLE_KEY");

export const isSupabaseAdminConfigured = () => Boolean(getServiceRoleKey());

export const getSupabaseAdmin = () => {
	const supabaseUrl = getEnv("SUPABASE_URL");
	const serviceRoleKey = getServiceRoleKey();

	if (!supabaseUrl) {
		throw new Error("Missing SUPABASE_URL.");
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
