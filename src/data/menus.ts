import type { MainMenuItem, MenuNavigation } from "~/types";

export const menuMain: MainMenuItem[] = [
	{
		id: "home",
		label: "Home",
		url: "/",
	},
	{
		id: "how-it-works",
		label: "How It Works",
		url: "/#how-it-works",
	},
	{
		id: "makes",
		label: "Supported Makes",
		url: "/makes",
	},
];

export const menuNavigation: MenuNavigation = {
	prettyName: "Navigation",
	items: [
		{
			name: "Home",
			url: "/",
		},
		{
			name: "How It Works",
			url: "/#how-it-works",
		},
		{
			name: "Supported Makes",
			url: "/makes",
		},
		{
			name: "Contact",
			url: "/contact",
		},
	],
};

export const menuService: MenuNavigation = {
	prettyName: "Quote Tools",
	items: [
		{
			name: "Start A Quote",
			url: "/",
		},
		{
			name: "Supported Makes",
			url: "/makes",
		},
		{
			name: "Contact",
			url: "/contact",
		},
	],
};

export const menuMisc: MenuNavigation = {
	prettyName: "Company",
	items: [
		{
			name: "About Us",
			url: "/about-us",
		},
	],
};

export const menuLegal: MenuNavigation = {
	prettyName: "Legal",
	items: [
		{
			name: "Terms",
			url: "/contact",
		},
		{
			name: "Privacy",
			url: "/contact",
		},
	],
};
