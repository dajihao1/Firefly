import { visit } from "unist-util-visit";

function isElement(node, tagName) {
	return node?.type === "element" && (!tagName || node.tagName === tagName);
}

function textContent(node) {
	if (!node) {
		return "";
	}
	if (node.type === "text") {
		return node.value || "";
	}
	if (!Array.isArray(node.children)) {
		return "";
	}
	return node.children.map(textContent).join("");
}

function hrefOf(node) {
	return typeof node?.properties?.href === "string" ? node.properties.href : "";
}

function normalizeRenderedUrl(value) {
	if (typeof value !== "string" || value.length === 0) {
		return value;
	}

	let url = value
		.trim()
		.replace(/^https:\/(?!\/)/, "https://")
		.replace(/^http:\/(?!\/)/, "http://")
		.replace(/(?:%5D|\])\(https?:\/\/.*$/i, "");

	if (/^https:\/\/linux\.do\/t\/topic\/[^#]+#p-/i.test(url)) {
		url = url.replace(/\).*$/g, "");
	}

	if (/\)(?:%[0-9a-f]{2}|[，,。；;：:]).*$/i.test(url)) {
		url = url.replace(/\)(?:%[0-9a-f]{2}|[，,。；;：:]).*$/i, "");
	}

	return url;
}

function isLinuxDoHeadingLink(node) {
	const href = hrefOf(node);
	return isElement(node, "a") && /^https:\/\/linux\.do\/t\/topic\/[^#]+#p-/i.test(href);
}

function isEmptyAnchor(node) {
	return textContent(node).trim() === "";
}

function isBrokenHeadingLink(node) {
	if (!isLinuxDoHeadingLink(node)) {
		return false;
	}
	const text = textContent(node).trim();
	const href = hrefOf(node);
	return (
		text === "" ||
		text.startsWith("https://linux.do/t/topic/") ||
		text.startsWith(href) ||
		href.includes(")%") ||
		text.includes(")%") ||
		text.includes(")http") ||
		text.length > 80
	);
}

function isAnchorIcon(node) {
	const className = node?.properties?.className;
	const classes = Array.isArray(className)
		? className
		: typeof className === "string"
			? className.split(/\s+/)
			: [];
	return isElement(node, "a") && classes.includes("anchor");
}

function cleanHeadingText(value) {
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
	if (!Array.isArray(node.children)) {
		return;
	}

	const cleaned = [];
	for (const child of node.children) {
		if (isAnchorIcon(child)) {
			cleaned.push(child);
			continue;
		}
		if (isBrokenHeadingLink(child) || (isLinuxDoHeadingLink(child) && isEmptyAnchor(child))) {
			continue;
		}
		if (child.type === "text") {
			const value = cleanHeadingText(child.value || "");
			if (value) {
				cleaned.push({ ...child, value });
			}
			continue;
		}
		cleaned.push(child);
	}

	node.children = cleaned;
}

function isUrlTextLink(node) {
	if (!isElement(node, "a")) {
		return false;
	}
	const text = textContent(node).trim();
	const href = hrefOf(node);
	return /^https?:\/\//i.test(text) && normalizeRenderedUrl(text) === normalizeRenderedUrl(href);
}

function isHttpLink(node) {
	return isElement(node, "a") && /^https?:\/\//i.test(hrefOf(node));
}

function cleanLinkText(node) {
	if (!isHttpLink(node) || !Array.isArray(node.children)) {
		return;
	}

	const text = textContent(node).trim();
	const href = normalizeRenderedUrl(hrefOf(node));
	if (/^https?:\/\//i.test(text) && /(?:\]\(|\)\||\]\(|\|])/.test(text)) {
		node.children = [{ type: "text", value: href }];
	}
}

function isImageOnlyLink(node) {
	return isElement(node, "a") && node.children?.some((child) => isElement(child, "img"));
}

function isBrokenMarkdownText(node) {
	if (node?.type !== "text") {
		return false;
	}
	return /^[\])\s*]+$/.test(node.value || "") || /(?:^|\s)(?:\]\(|\)\]?\(|\]\))/.test(node.value || "");
}

function cleanBrokenLinkFragments(node) {
	if (!Array.isArray(node.children)) {
		return;
	}

	const cleaned = [];
	for (let i = 0; i < node.children.length; i++) {
		const child = node.children[i];
		const previous = cleaned[cleaned.length - 1];
		const next = node.children[i + 1];

		if (child.type === "text") {
			let value = child.value || "";

			if (isHttpLink(next)) {
				value = value.replace(/\[$/, "");
			}

			if (previous && (isElement(previous, "a") || isBrokenMarkdownText(previous))) {
				value = value
					.replace(/\]\(/g, "")
					.replace(/^\)+/, "")
					.replace(/\)+$/, "");
			}

			if (value === "") {
				continue;
			}

			cleaned.push({ ...child, value });
			continue;
		}

		if (
			isBrokenMarkdownText(child) &&
			(previous || isUrlTextLink(node.children[i + 1]) || isBrokenMarkdownText(previous))
		) {
			continue;
		}

		if (isUrlTextLink(child) && (isImageOnlyLink(previous) || isBrokenMarkdownText(previous))) {
			continue;
		}

		if (
			isUrlTextLink(child) &&
			isElement(previous, "a") &&
			normalizeRenderedUrl(hrefOf(previous)) === normalizeRenderedUrl(hrefOf(child))
		) {
			continue;
		}

		cleanLinkText(child);
		cleaned.push(child);
	}

	node.children = cleaned.filter((child, index, children) => {
		if (!isBrokenMarkdownText(child)) {
			return true;
		}
		return !(isImageOnlyLink(children[index - 1]) || isUrlTextLink(children[index - 1]));
	});
}

/**
 * MarkDownload sometimes copies Linux.do heading anchors as visible markdown
 * fragments like `](https://...)`. Hide those fragments at render time.
 */
export default function rehypeCleanMarkDownload() {
	return (tree) => {
		visit(tree, "element", (node) => {
			if (typeof node.properties?.href === "string") {
				node.properties.href = normalizeRenderedUrl(node.properties.href);
			}
			if (typeof node.properties?.src === "string") {
				node.properties.src = normalizeRenderedUrl(node.properties.src);
			}
		});

		visit(tree, "element", (node) => {
			if (/^h[1-6]$/.test(node.tagName)) {
				cleanHeading(node);
				return;
			}

			if (Array.isArray(node.children)) {
				cleanBrokenLinkFragments(node);
			}
		});
	};
}
