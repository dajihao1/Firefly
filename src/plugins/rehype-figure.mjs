import { h } from "hastscript";
import { visit } from "unist-util-visit";
import { shouldAddNoReferrer } from "../utils/image-utils.ts";

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
			const isTwemojiImage =
				src.includes("/images/emoji/twemoji/") ||
				src.includes("/emoji/twemoji/") ||
				/^:[a-z0-9_+-]+:$/i.test(altText);

			// MarkDownload 会把论坛里的 emoji/小方块复制成图片。
			// 这些应该保持行内显示，不能被转换成大图和图注。
			if (isTwemojiImage) {
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
				node.properties = imgProps;
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
	};
}
