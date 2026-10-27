import type { AstroCookies } from "astro";

const cookieName = "ibuycarkeys_feedback";
const messages = {
	"signed-in": "You're signed in.",
	"signed-out": "You're signed out.",
	"account-created": "Your account has been created. You're signed in.",
};
type FeedbackCode = keyof typeof messages;

export const setActionFeedback = (cookies: AstroCookies, code: FeedbackCode, secure: boolean) => {
	cookies.set(cookieName, code, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 });
};

export const consumeActionFeedback = (cookies: AstroCookies) => {
	const code = cookies.get(cookieName)?.value;
	if (!code) return "";
	cookies.delete(cookieName, { path: "/" });
	return Object.hasOwn(messages, code) ? messages[code as FeedbackCode] : "";
};
