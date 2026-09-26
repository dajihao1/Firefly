import fs from "node:fs";

const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;

if (!databaseId) {
	throw new Error("CLOUDFLARE_D1_DATABASE_ID is required to deploy the visit logger.");
}

const config = JSON.parse(fs.readFileSync("wrangler.jsonc", "utf8"));

config.main = "src/worker.ts";
config.assets = {
	...config.assets,
	binding: "ASSETS",
	// Keep the public site static while ensuring private API requests reach the Worker.
	run_worker_first: ["/api/*"],
};
config.d1_databases = [
	{
		binding: "VISITS_DB",
		database_name: "blog-visit-logs",
		database_id: databaseId,
	},
];
config.triggers = {
	crons: ["15 19 * * *"],
};

fs.writeFileSync("wrangler.deploy.json", `${JSON.stringify(config, null, 2)}\n`);
