import { visit } from "unist-util-visit";

function normalizeUrl(value) {
	if (typeof value !== "string" || value.length === 0) return value;

	let url = value.trim();

	// MarkDownload can sometimes emit nested markdown as an image URL:
	// ![]([https:/example/image.png](https://example/image.png))
	const bracketedUrl = url.match(/^\[(https?:\/{1,2}[^\]\s)]+)/);
	if (bracketedUrl) {
		url = bracketedUrl[1];
	}

	return url
		.replace(/^https:\/(?!\/)/, "https://")
		.replace(/^http:\/(?!\/)/, "http://");
}

export function remarkNormalizeUrls() {
	return (tree) => {
		visit(tree, ["image", "link", "definition"], (node) => {
			if ("url" in node) {
				node.url = normalizeUrl(node.url);
			}
		});
	};
}
