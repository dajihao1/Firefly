import fs from "node:fs";
import path from "node:path";

const postsDir = path.resolve("src/content/posts");

function normalizeUrl(url) {
	return url
		.trim()
		.replace(/^https:\/(?!\/)/, "https://")
		.replace(/^http:\/(?!\/)/, "http://")
		.replace(/(?:%5D|\])\(https?:\/\/.*$/i, "");
}

function cleanNestedLinks(text) {
	let cleaned = text;
	let previous = "";

	while (previous !== cleaned) {
		previous = cleaned;
		cleaned = cleaned
			.replace(
				/\[([^\]\n]+)\]\(\[(https?:\/{1,2}[^\]\s)]+)\]\((https?:\/\/[^\s)]+)\)(\*{1,3})?\)\4?/gi,
				(_, label, _brokenUrl, url, emphasis = "") => `[${label}](${normalizeUrl(url)})${emphasis}`,
			)
			.replace(
				/\[\[(https?:\/\/[^\]\s)]+)\]\((https?:\/\/[^\s)]+)\)\]\((https?:\/\/[^\s)]+)\]\([^)]+\)\)/gi,
				(_, label, url) => `[${label}](${normalizeUrl(url)})`,
			)
			.replace(
				/\[\[(https?:\/\/[^\]\s)]+)\]\((https?:\/\/[^\s)]+)\)\]\((https?:\/\/[^\s)]+)\)/gi,
				(_, label, url) => `[${label}](${normalizeUrl(url)})`,
			)
			.replace(
				/\[([^\]\n]+)\]\(\[(https?:\/{1,2}[^\]\s)]+)\]\((https?:\/\/[^\]\s)]+)\)\)/gi,
				(_, label, _brokenUrl, url) => `[${label}](${normalizeUrl(url)})`,
			)
			.replace(
				/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\]\((https?:\/\/[^\s)]+)\)\)/gi,
				(_, label, url) => `[${label}](${normalizeUrl(url)})`,
			);
	}

	return cleaned;
}

function cleanImageOnlyLine(line) {
	const match = line.match(/^(\s*(?:>\s*)?)(?:\[)?!\[([^\]]*)\]\(/);
	if (!match) {
		return null;
	}

	const urls = Array.from(
		line.matchAll(/https?:\/{1,2}[^\s\])"]+\.(?:png|jpe?g|gif|webp)(?:\?[^\s\])"]*)?/gi),
		(match) => normalizeUrl(match[0]),
	);
	if (urls.length === 0) {
		return null;
	}

	const usableUrls = urls.filter((url) => !/\/(?:user_avatar|letter_avatar)\//i.test(url));
	if (usableUrls.length === 0) {
		return "";
	}

	const title = line.match(/"([^"]+)"/)?.[1];
	const alt = match[2] || "";
	const url = usableUrls[0];

	return `${match[1]}![${alt}](${url}${title ? ` "${title}"` : ""})`;
}

function cleanHeadingBody(body) {
	let cleaned = cleanNestedLinks(body).replace(/\[\]\(\[?https?:\/\/linux\.do\/t\/topic\/[^\)]*\)/gi, "");

	let previous = "";
	while (previous !== cleaned) {
		previous = cleaned;
		cleaned = cleaned
			.replace(
				/^(.+?)\]\(\[?https?:\/\/linux\.do\/t\/topic\/[^\)]*\)\1\]\(https?:\/\/linux\.do\/t\/topic\/[^\)]*\)\1\)\)?(.*)$/i,
				"$1$2",
			)
			.replace(
				/^(.+?)\]\(\[?https?:\/\/linux\.do\/t\/topic\/[^\)]*\)\1\)(.*)$/i,
				"$1$2",
			);
	}

	return cleaned
		.replace(/\]\(\[(https?:\/\/[^\]\s)]+)\]\(\1\)\)/g, "]($1)")
		.replace(/\]\(\[(https?:\/\/[^\]\s)]+)\]\((https?:\/\/[^\]\s)]+)\)\)/g, "]($2)")
		.replace(/\[\]\(\[?https?:\/\/linux\.do\/t\/topic\/[^\)]*\)/gi, "")
		.replace(/\s{2,}/g, " ")
		.trim();
}

function cleanLine(line) {
	const trimmed = line.trim();
	if (/^\[?!\[[^\]]*\]\(\[?https?:\/{1,2}cdn\.ldstatic\.com\/(?:user_avatar|letter_avatar)\//i.test(trimmed)) {
		return "";
	}

	const imageLine = cleanImageOnlyLine(line);
	if (imageLine !== null) {
		return imageLine;
	}

	const heading = line.match(/^(#{1,6}\s+)(.*)$/);
	if (heading) {
		return `${heading[1]}${cleanHeadingBody(heading[2])}`;
	}

	return cleanNestedLinks(line)
		.replace(/\]\(\[(https?:\/\/[^\]\s)]+)\]\(\1\)\)/g, "]($1)")
		.replace(/\]\(\[(https?:\/\/[^\]\s)]+)\]\((https?:\/\/[^\]\s)]+)\)\)/g, "]($2)")
		.replace(/(\[[^\]]+\]\(https?:\/\/[^\s)]+)\]\(https?:\/\/[^\s)]+\)\)/g, "$1)");
}

function cleanMarkdown(content) {
	return content
		.split(/\r?\n/)
		.map(cleanLine)
		.filter((line, index, lines) => !(line === "" && lines[index - 1] === ""))
		.join("\n");
}

function listMarkdownFiles(dir) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...listMarkdownFiles(fullPath));
		} else if (entry.isFile() && entry.name.endsWith(".md")) {
			files.push(fullPath);
		}
	}
	return files;
}

let changed = 0;
for (const file of listMarkdownFiles(postsDir)) {
	const original = fs.readFileSync(file, "utf8");
	const cleaned = cleanMarkdown(original);
	if (cleaned !== original) {
		fs.writeFileSync(file, cleaned, "utf8");
		changed++;
	}
}

if (changed > 0) {
	console.log(`Cleaned MarkDownload markdown in ${changed} file(s).`);
}
