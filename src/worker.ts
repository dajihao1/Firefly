type AssetFetcher = {
	fetch(request: Request): Promise<Response>;
};

type D1Statement = {
	bind(...values: unknown[]): {
		run(): Promise<unknown>;
	};
};

type VisitDatabase = {
	prepare(query: string): D1Statement;
};

type WorkerContext = {
	waitUntil(promise: Promise<unknown>): void;
};

type RequestWithCloudflareData = Request & {
	cf?: {
		country?: string | null;
		region?: string | null;
		city?: string | null;
	};
};

interface Env {
	ASSETS: AssetFetcher;
	VISITS_DB: VisitDatabase;
}

const RETENTION_DAYS = 90;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

function localizeCountry(countryCode: string | null | undefined): string | null {
	if (!countryCode) {
		return null;
	}

	try {
		return new Intl.DisplayNames(["zh-CN"], { type: "region" }).of(countryCode) ?? countryCode;
	} catch {
		return countryCode;
	}
}

function isPageVisit(request: Request): boolean {
	if (request.method !== "GET") {
		return false;
	}

	// Ignore browser prefetches and asset requests. One page view becomes one log row.
	if (request.headers.get("purpose")?.toLowerCase() === "prefetch") {
		return false;
	}

	const destination = request.headers.get("sec-fetch-dest");
	if (destination && destination !== "document") {
		return false;
	}

	return request.headers.get("accept")?.includes("text/html") ?? false;
}

async function recordVisit(request: RequestWithCloudflareData, env: Env): Promise<void> {
	const ip = request.headers.get("CF-Connecting-IP");
	if (!ip) {
		return;
	}

	const path = new URL(request.url).pathname;
	const country = localizeCountry(request.cf?.country);
	const region = request.cf?.region ?? null;
	const city = request.cf?.city ?? null;
	const location = [country, region, city].filter(Boolean).join("-") || "未知";

	await env.VISITS_DB.prepare(
		"INSERT INTO visit_logs (ip, visited_at, path, country, region, city, location) VALUES (?, ?, ?, ?, ?, ?, ?)",
	)
		.bind(ip, Date.now(), path, country, region, city, location)
		.run();
}

async function deleteExpiredVisits(env: Env): Promise<void> {
	const expiresBefore = Date.now() - RETENTION_MS;
	await env.VISITS_DB.prepare("DELETE FROM visit_logs WHERE visited_at < ?")
		.bind(expiresBefore)
		.run();
}

export default {
	async fetch(request: Request, env: Env, ctx: WorkerContext): Promise<Response> {
		if (isPageVisit(request)) {
			// Logging runs after the response starts so a database failure never delays the blog.
			ctx.waitUntil(recordVisit(request as RequestWithCloudflareData, env));
		}

		return env.ASSETS.fetch(request);
	},

	async scheduled(_controller: unknown, env: Env, ctx: WorkerContext): Promise<void> {
		ctx.waitUntil(deleteExpiredVisits(env));
	},
};
