import {
	type NavBarConfig,
	type NavBarLink,
	type NavBarSearchConfig,
	NavBarSearchMethod,
} from "../types/navBarConfig";

// ============================================================================
// 导航栏配置 - 根据顺序动态生成导航栏链接
// NavBar Configuration - Dynamically generate navigation bar links based on order
// ============================================================================
const getDynamicNavBarConfig = (): NavBarConfig => {
	// 基础导航栏链接
	const links: NavBarLink[] = [
		// 主页
		LinkPresets.Home,
	];

	// 文章及其子菜单
	links.push({
		name: "文章",
		url: "#",
		icon: "material-symbols:article",
		children: [
			// 归档
			LinkPresets.Archive,

			// 分类
			LinkPresets.Categories,

			// 标签
			LinkPresets.Tags,
		],
	});

	// 我的导航入口 - 指向自己的其他站点
	// TODO: 把下面的 url 替换成你自己的真实地址
	links.push({
		name: "导航",
		url: "#",
		icon: "material-symbols:link",
		children: [
			{
				name: "探针",
				url: "https://8228122.com/probe",
				external: true,
				icon: "material-symbols:monitor-heart",
			},
			{
				name: "域名邮箱",
				url: "https://8228122.com/mail",
				external: true,
				icon: "material-symbols:alternate-email",
			},
			{
				name: "小说工具台",
				url: "https://8228122.com/novel",
				external: true,
				icon: "material-symbols:auto-stories",
			},
			{
				name: "CPA",
				url: "https://8228122.com/cpa",
				external: true,
				icon: "material-symbols:assignment",
			},
		],
	});

	// 关于页面
	links.push({
		name: "关于",
		url: "#",
		icon: "material-symbols:info",
		children: [
			// 关于页面
			LinkPresets.About,
		],
	});

	return { links } as NavBarConfig;
};

// 导航搜索配置
export const navBarSearchConfig: NavBarSearchConfig = {
	method: NavBarSearchMethod.PageFind,
};

// ============================================================================
// 链接预设 - 可自由自定义导航栏链接的名称、图标和URL
// Link Presets - Allows free customization of the name, icon, and URL of navigation bar links
// ============================================================================
export const LinkPresets: Record<string, NavBarLink> = {
	Home: {
		name: "主页",
		url: "/",
		icon: "material-symbols:home",
	},
	Archive: {
		name: "归档",
		url: "/archive/",
		icon: "material-symbols:archive",
	},
	Categories: {
		name: "分类",
		url: "/categories/",
		icon: "material-symbols:folder-open-rounded",
	},
	Tags: {
		name: "标签",
		url: "/tags/",
		icon: "material-symbols:tag-rounded",
	},
	Friends: {
		name: "友链",
		url: "/friends/",
		icon: "material-symbols:group",
		pageKey: "friends",
	},
	Sponsor: {
		name: "打赏",
		url: "/sponsor/",
		icon: "material-symbols:favorite",
		pageKey: "sponsor",
	},
	Guestbook: {
		name: "留言",
		url: "/guestbook/",
		icon: "material-symbols:chat",
		pageKey: "guestbook",
	},
	About: {
		name: "关于我",
		url: "/about/",
		icon: "material-symbols:person",
	},
	Bangumi: {
		name: "番组计划",
		url: "/bangumi/",
		icon: "material-symbols:movie",
		pageKey: "bangumi",
	},
	Gallery: {
		name: "相册",
		url: "/gallery/",
		icon: "material-symbols:photo-library",
		pageKey: "gallery",
	},
	Anime: {
		name: "追番",
		url: "/anime/",
		icon: "material-symbols:live-tv",
		pageKey: "anime",
	},
};

export const navBarConfig: NavBarConfig = getDynamicNavBarConfig();