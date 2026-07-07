import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve("dist/posts");

function listHtmlFiles(dir) {
	if (!fs.existsSync(dir)) return [];

	const entries = fs.readdirSync(dir, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...listHtmlFiles(fullPath));
		} else if (entry.isFile() && entry.name.endsWith(".html")) {
			files.push(fullPath);
		}
	}
	return files;
}

function cleanHtml(html) {
	return html
		.replace(/\[<a\b/g, "<a")
		.replace(
			/(<a\b[^>]*>)(https?:\/\/[^<]*?)(?:\)\|[^<]*|\]\([^<]*)(<\/a>)/g,
			(_, open, url, close) => `${open}${url}${close}`,
		)
		.replace(/\]\(<a\b[^>]*>https?:\/\/[^<]+<\/a>\)/g, "");
}

let changed = 0;
for (const file of listHtmlFiles(distDir)) {
	const original = fs.readFileSync(file, "utf8");
	const cleaned = cleanHtml(original);
	if (cleaned !== original) {
		fs.writeFileSync(file, cleaned, "utf8");
		changed++;
	}
}

if (changed > 0) {
	console.log(`Post-processed MarkDownload HTML in ${changed} file(s).`);
}
