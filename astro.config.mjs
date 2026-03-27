// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import playformInline from "@playform/inline";
import netlify from "@astrojs/netlify";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
	site: "https://ibuycarkeys.com",
	base: "/",
	integrations: [mdx(), playformInline({ Critters: true })],
	output: "server",
	devToolbar: {
		enabled: false,
	},
	adapter: netlify(),
	vite: {
		plugins: [tailwindcss()],
	},
});

