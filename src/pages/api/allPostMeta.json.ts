import { getSortedPosts } from "@/utils/content-utils";
import {
	getPublicPostTitle,
	isPasswordProtectedPost,
} from "@/utils/privacy-utils";

export async function GET() {
	const posts = await getSortedPosts();

	const allPostsData = posts
		.map((post) => ({
			id: post.id,
			title: getPublicPostTitle(
				post.data.title,
				isPasswordProtectedPost(post.data),
			),
			description: "",
			published: post.data.published.getTime(),
			category: post.data.category || "",
			password: isPasswordProtectedPost(post.data),
		}))
		// 日历按纯日期排序，忽略置顶
		.sort((a, b) => b.published - a.published);

	return new Response(JSON.stringify(allPostsData));
}
