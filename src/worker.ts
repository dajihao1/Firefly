type AssetFetcher = {
	fetch(request: Request): Promise<Response>;
};

type D1BoundStatement = {
	run(): Promise<unknown>;
	all<T>(): Promise<{
		results: T[];
	}>;
};

type D1Statement = {
	bind(...values: unknown[]): D1BoundStatement;
	all<T>(): Promise<{
		results: T[];
	}>;
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
	VISIT_LOGS_ADMIN_PASSWORD?: string;
}

const RETENTION_DAYS = 90;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
const SESSION_DURATION_SECONDS = 12 * 60 * 60;
const SESSION_COOKIE_NAME = "__Host-visit-logs-session";
const encoder = new TextEncoder();

type VisitLog = {
	ip: string;
	visited_at: number;
	path: string;
	country: string | null;
	region: string | null;
	city: string | null;
	location: string;
};

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

function jsonResponse(data: unknown, status = 200, headers: HeadersInit = {}): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "application/json; charset=utf-8",
			...headers,
		},
	});
}

function getCookie(request: Request, name: string): string | null {
	const cookies = request.headers.get("Cookie") || "";
	for (const value of cookies.split(";")) {
		const [key, ...parts] = value.trim().split("=");
		if (key === name) {
			return parts.join("=") || null;
		}
	}
	return null;
}

function toBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function secureEqual(left: string, right: string): boolean {
	const leftBytes = encoder.encode(left);
	const rightBytes = encoder.encode(right);
	let difference = leftBytes.length ^ rightBytes.length;
	const length = Math.max(leftBytes.length, rightBytes.length);

	for (let index = 0; index < length; index++) {
		difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
	}

	return difference === 0;
}

async function createSessionToken(password: string): Promise<string> {
	const issuedAt = Math.floor(Date.now() / 1000).toString();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(password),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = new Uint8Array(
		await crypto.subtle.sign("HMAC", key, encoder.encode(issuedAt)),
	);
	return `${issuedAt}.${toBase64Url(signature)}`;
}

async function hasValidSession(request: Request, password: string): Promise<boolean> {
	const token = getCookie(request, SESSION_COOKIE_NAME);
	if (!token) {
		return false;
	}

	const [issuedAt, signature, ...extra] = token.split(".");
	const issuedAtSeconds = Number(issuedAt);
	if (
		extra.length > 0 ||
		!Number.isInteger(issuedAtSeconds) ||
		issuedAtSeconds + SESSION_DURATION_SECONDS < Math.floor(Date.now() / 1000)
	) {
		return false;
	}

	const expected = await createSessionTokenForTimestamp(issuedAt, password);
	return secureEqual(token, expected);
}

async function createSessionTokenForTimestamp(timestamp: string, password: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(password),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = new Uint8Array(
		await crypto.subtle.sign("HMAC", key, encoder.encode(timestamp)),
	);
	return `${timestamp}.${toBase64Url(signature)}`;
}

async function handleAdminSession(request: Request, env: Env): Promise<Response> {
	if (!env.VISIT_LOGS_ADMIN_PASSWORD) {
		return jsonResponse({ error: "Admin access is not configured" }, 503);
	}

	if (request.method === "GET") {
		const authenticated = await hasValidSession(request, env.VISIT_LOGS_ADMIN_PASSWORD);
		return jsonResponse({ authenticated }, authenticated ? 200 : 401);
	}

	if (request.method === "DELETE") {
		return jsonResponse(
			{ ok: true },
			200,
			{
				"Set-Cookie": `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
			},
		);
	}

	if (request.method !== "POST") {
		return jsonResponse({ error: "Method not allowed" }, 405, { Allow: "GET, POST, DELETE" });
	}

	let password = "";
	try {
		const body = (await request.json()) as { password?: unknown };
		password = typeof body.password === "string" ? body.password : "";
	} catch {
		return jsonResponse({ error: "Invalid request" }, 400);
	}

	if (!secureEqual(password, env.VISIT_LOGS_ADMIN_PASSWORD)) {
		return jsonResponse({ error: "Invalid password" }, 401);
	}

	const token = await createSessionToken(env.VISIT_LOGS_ADMIN_PASSWORD);
	return jsonResponse(
		{ ok: true },
		200,
		{
			"Set-Cookie": `${SESSION_COOKIE_NAME}=${token}; Path=/; Max-Age=${SESSION_DURATION_SECONDS}; HttpOnly; Secure; SameSite=Strict`,
		},
	);
}

async function getVisitLogs(request: Request, env: Env): Promise<Response> {
	if (request.method !== "GET") {
		return jsonResponse({ error: "Method not allowed" }, 405, { Allow: "GET" });
	}

	if (!env.VISIT_LOGS_ADMIN_PASSWORD || !(await hasValidSession(request, env.VISIT_LOGS_ADMIN_PASSWORD))) {
		return jsonResponse({ error: "Unauthorized" }, 401);
	}

	try {
		const { results } = await env.VISITS_DB.prepare(
			"SELECT ip, visited_at, path, country, region, city, location FROM visit_logs ORDER BY visited_at DESC LIMIT 200",
		)
			.all<VisitLog>();
		return jsonResponse({ visits: results });
	} catch {
		return jsonResponse({ error: "Unable to load visit logs" }, 500);
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: WorkerContext): Promise<Response> {
		const pathname = new URL(request.url).pathname;
		if (pathname === "/api/admin/session" || pathname === "/api/admin/visit-logs/session") {
			return handleAdminSession(request, env);
		}
		if (pathname === "/api/admin/visit-logs") {
			return getVisitLogs(request, env);
		}

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
