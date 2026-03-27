import { createClient } from "@supabase/supabase-js";

const getEnv = (key: string) => globalThis.process?.env?.[key]?.trim() ?? "";

const supabaseUrl = getEnv("SUPABASE_URL");
const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");

if (!supabaseUrl) {
	throw new Error("Missing SUPABASE_URL.");
}

if (!supabaseAnonKey) {
	throw new Error("Missing SUPABASE_ANON_KEY.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
