import rss, { type RSSFeedItem } from "@astrojs/rss";
import { getSortedPosts } from "@utils/content-utils";
import { formatDateI18nWithTime } from "@utils/date-utils";
import { getPublicPostTitle } from "@utils/privacy-utils";
import { url } from "@utils/url-utils";
import type { APIContext } from "astro";
import { siteConfig } from "@/config";
import pkg from "../../package.json";

export async function GET(context: APIContext) {
	const blog = await getSortedPosts();
	const feedItems: RSSFeedItem[] = [];
	for (const post of blog) {
		feedItems.push({
			title: getPublicPostTitle(post.data.title, !!post.data.password),
			pubDate: post.data.published,
			description: "",
			link: url(`/posts/${post.id}/`),
			content: "私人收藏，仅显示标题和原文链接。",
		});
	}
	return rss({
		title: siteConfig.title,
		description: siteConfig.subtitle || "No description",
		site: context.site ?? "https://firefly.cuteleaf.cn",
		customData: `<templateTheme>Firefly</templateTheme>
		<templateThemeVersion>${pkg.version}</templateThemeVersion>
		<templateThemeUrl>https://github.com/CuteLeaf/Firefly</templateThemeUrl>
		<lastBuildDate>${formatDateI18nWithTime(new Date())}</lastBuildDate>`,
		items: feedItems,
	});
}
