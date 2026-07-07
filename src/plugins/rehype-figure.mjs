import { h } from "hastscript";
import { visit } from "unist-util-visit";
import { shouldAddNoReferrer } from "../utils/image-utils.ts";

const forumStickerAltPattern =
	/^:?(?:bili|tieba|aru|blob|blobcat|doge|huaji|linuxdo|parrot|qq|telegram|tg|weibo)_[a-z0-9]+:?$/i;

function isCopiedInlineEmoji(src, altText) {
	return (
		src.includes("/images/emoji/twemoji/") ||
		src.includes("/emoji/twemoji/") ||
		/^:[a-z0-9_+-]+:$/i.test(altText) ||
		(/ldstatic\.com/i.test(src) && forumStickerAltPattern.test(altText))
	);
}

function applyInlineEmojiProps(imgProps) {
	const rawClassName = imgProps.className;
	const classNames = Array.isArray(rawClassName)
		? rawClassName
		: typeof rawClassName === "string"
			? rawClassName.split(/\s+/).filter(Boolean)
			: [];
	if (!classNames.includes("inline-emoji")) {
		classNames.push("inline-emoji");
	}
	imgProps.className = classNames;
	imgProps.loading = imgProps.loading || "lazy";
	imgProps.style = [
		typeof imgProps.style === "string" ? imgProps.style : "",
		"display:inline-block",
		"width:1em",
		"height:1em",
		"vertical-align:-0.125em",
		"margin:0 .15em",
		"object-fit:contain",
		"border-radius:0",
	]
		.filter(Boolean)
		.join(";");
	return imgProps;
}

function getText(node) {
	if (!node) {
		return "";
	}
	if (node.type === "text") {
		return node.value || "";
	}
	if (!Array.isArray(node.children)) {
		return "";
	}
	return node.children.map(getText).join("");
}

/**
 * 将带有 alt 文本的图片转换为包含 figcaption 的 figure 元素的 rehype 插件
 *
 * @returns {Function} A transformer function for the rehype plugin
 */
export default function rehypeFigure() {
	return (tree) => {
		visit(tree, "element", (node, index, parent) => {
			// 只处理 img 元素
			if (node.tagName !== "img") {
				return;
			}

			// 跳过已由其它插件接管渲染的图片（例如 plantuml）
			const classRaw = node.properties?.className;
			const classNames = Array.isArray(classRaw)
				? classRaw
				: typeof classRaw === "string"
					? classRaw.split(/\s+/)
					: [];
			if (classNames.includes("plantuml-image")) {
				return;
			}

			const imgProps = { ...node.properties };

			// 添加 referrerpolicy（如果需要）解决 403 问题
			// 无论是否有 alt，都要检查并添加 referrerpolicy
			if (imgProps.src && shouldAddNoReferrer(imgProps.src)) {
				imgProps.referrerpolicy = "no-referrer";
			}

			// 获取 alt 属性
			const alt = imgProps.alt;
			const src = typeof imgProps.src === "string" ? imgProps.src : "";
			const altText = typeof alt === "string" ? alt.trim() : "";

			// MarkDownload 会把论坛里的 emoji/小方块复制成图片。
			// 这些应该保持行内显示，不能被转换成大图和图注。
			if (isCopiedInlineEmoji(src, altText)) {
				node.properties = applyInlineEmojiProps(imgProps);
				return;
			}

			// 如果没有 alt 属性或 alt 为空字符串，则只更新属性并保持原样
			if (!altText) {
				node.properties = imgProps;
				return;
			}

			// 创建 figure 元素，包含处理后的 img 和居中的 figcaption
			const figure = h("figure", [
				// 使用原始属性的 img 节点
				h("img", {
					...imgProps,
				}),
				h("figcaption", alt),
			]);

			// 居中显示
			const centerFigure = h("center", figure);

			// 替换当前的 img 节点为 figure 节点
			if (parent && typeof index === "number") {
				parent.children[index] = centerFigure;
			}
		});

		// 兜底处理：少数 MarkDownload 生成的半坏链接会先被包成 figure，
		// 这里再把论坛表情图从 figure 还原为行内 img。
		visit(tree, "element", (node, index, parent) => {
			if (node.tagName !== "center" && node.tagName !== "figure") {
				return;
			}

			const figure =
				node.tagName === "figure"
					? node
					: node.children?.find((child) => child.type === "element" && child.tagName === "figure");
			if (!figure) {
				return;
			}

			const img = figure.children?.find((child) => child.type === "element" && child.tagName === "img");
			const caption = figure.children?.find(
				(child) => child.type === "element" && child.tagName === "figcaption",
			);
			if (!img || !caption) {
				return;
			}

			const imgProps = { ...img.properties };
			const src = typeof imgProps.src === "string" ? imgProps.src : "";
			const altText =
				typeof imgProps.alt === "string" && imgProps.alt.trim()
					? imgProps.alt.trim()
					: getText(caption).trim();
			if (!isCopiedInlineEmoji(src, altText)) {
				return;
			}

			img.properties = applyInlineEmojiProps(imgProps);
			if (parent && typeof index === "number") {
				parent.children[index] = img;
			}
		});
	};
}
