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

	url = url
		.replace(/^https:\/(?!\/)/, "https://")
		.replace(/^http:\/(?!\/)/, "http://");

	// MarkDownload can emit nested links, for example:
	// https://example/a.png%5D(https://example/b.png)
	url = url.replace(/(?:%5D|\])\(https?:\/\/.*$/i, "");

	// Linux.do heading anchors are sometimes copied as:
	// https://linux.do/t/topic/123#p-456)%E6%A0%87%E9%A2%98
	url = url.replace(/\)(?:%[0-9a-f]{2}|https?:\/\/).*$/i, "");

	return url;
}

function nodeText(node) {
	if (!node) return "";
	if (node.type === "text") return node.value || "";
	if (!Array.isArray(node.children)) return "";
	return node.children.map(nodeText).join("");
}

function isLinuxDoHeadingUrl(url) {
	return typeof url === "string" && /^https:\/\/linux\.do\/t\/topic\/[^#]+#p-/i.test(normalizeUrl(url));
}

function isBrokenHeadingLink(node) {
	if (node?.type !== "link" || !isLinuxDoHeadingUrl(node.url)) return false;
	const text = nodeText(node).trim();
	return (
		text === "" ||
		text.startsWith("https://linux.do/t/topic/") ||
		text.includes(")%") ||
		text.includes(")http") ||
		text.length > 80
	);
}

function isUrlTextLink(node) {
	if (node?.type !== "link") return false;
	const text = nodeText(node).trim();
	const url = normalizeUrl(node.url || "");
	return /^https?:\/\//i.test(text) && normalizeUrl(text) === url;
}

function isImageOnlyLink(node) {
	return node?.type === "link" && node.children?.some((child) => child.type === "image");
}

function isBrokenMarkdownText(node) {
	if (node?.type !== "text") return false;
	return /^[\])\s*]+$/.test(node.value || "") || /(?:^|\s)(?:\]\(|\)\]?\(|\]\))/.test(node.value || "");
}

function cleanText(value) {
	return value
		.replace(/\[\]/g, "")
		.replace(/\]\($/g, "")
		.replace(/\]\(/g, "")
		.replace(/^\)+\s*/g, "")
		.replace(/\s+\)+$/g, "")
		.replace(/\)+$/g, "")
		.replace(/\s{2,}/g, " ");
}

function cleanHeading(node) {
	if (!Array.isArray(node.children)) return;

	const cleaned = [];
	for (const child of node.children) {
		if (isBrokenHeadingLink(child)) {
			continue;
		}
		if (child.type === "text") {
			const value = cleanText(child.value || "");
			if (value) cleaned.push({ ...child, value });
			continue;
		}
		cleaned.push(child);
	}
	node.children = cleaned;
}

function cleanParagraph(node) {
	if (!Array.isArray(node.children)) return;

	const cleaned = [];
	for (let i = 0; i < node.children.length; i++) {
		const child = node.children[i];
		const previous = cleaned[cleaned.length - 1];

		if (isBrokenMarkdownText(child) && (previous || isUrlTextLink(node.children[i + 1]))) {
			continue;
		}
		if (isUrlTextLink(child) && (isImageOnlyLink(previous) || isBrokenMarkdownText(previous))) {
			continue;
		}

		cleaned.push(child);
	}
	node.children = cleaned;
}

export function remarkNormalizeUrls() {
	return (tree) => {
		visit(tree, ["image", "link", "definition"], (node) => {
			if ("url" in node) {
				node.url = normalizeUrl(node.url);
			}
		});

		visit(tree, ["heading", "paragraph"], (node) => {
			if (node.type === "heading") {
				cleanHeading(node);
			} else {
				cleanParagraph(node);
			}
		});
	};
}
