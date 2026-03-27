import { createHash, timingSafeEqual } from "node:crypto";

export const adminSessionCookieName = "ibuycarkeys_admin_session";

const getEnv = (key: string) => globalThis.process?.env?.[key]?.trim() ?? import.meta.env[key]?.trim?.() ?? "";

const getAdminPassword = () => getEnv("ADMIN_PASSWORD");

const createSessionDigest = (password: string) => createHash("sha256").update(password).digest("hex");

const safeCompare = (left: string, right: string) => {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);

	if (leftBuffer.length !== rightBuffer.length) {
		return false;
	}

	return timingSafeEqual(leftBuffer, rightBuffer);
};

export const isAdminPasswordConfigured = () => Boolean(getAdminPassword());

export const isValidAdminPassword = (password: string) => {
	const configuredPassword = getAdminPassword();

	if (!configuredPassword) {
		return false;
	}

	return safeCompare(password, configuredPassword);
};

export const createAdminSessionToken = () => {
	const configuredPassword = getAdminPassword();

	if (!configuredPassword) {
		throw new Error("Missing ADMIN_PASSWORD.");
	}

	return createSessionDigest(configuredPassword);
};

export const isValidAdminSessionToken = (token?: string) => {
	const configuredPassword = getAdminPassword();

	if (!configuredPassword || !token) {
		return false;
	}

	const expectedToken = createSessionDigest(configuredPassword);
	return safeCompare(token, expectedToken);
};
