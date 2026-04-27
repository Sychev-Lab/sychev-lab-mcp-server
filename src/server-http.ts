/**
 * MCP HTTP Server with Streamable HTTP + SSE Legacy
 *
 * Usage:
 *   node dist/server-http.js       # Run HTTP server on port 3001
 *   PORT=3001 node dist/server-http.js
 */

import http from "http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { validateConfig, config } from "./config.js";
import {
	GetProductSchema,
	SearchProductsSchema,
	GetArticleSchema,
	GetTutorialSchema,
	GetCategoriesSchema,
	RegisterUserSchema,
	CreateCheckoutSchema,
	ListProductsSchema,
	ListArticlesSchema,
	ListTutorialsSchema,
	getProductDetails,
	searchProductsByCategory,
	getArticle,
	getTutorial,
	getCategories,
	registerUser,
	createStripeCheckout,
	listProducts,
	listArticles,
	listTutorials,
} from "./tools.js";

// ── Tool definitions ──────────────────────────────────────────────────

const TOOLS: Tool[] = [
	{
		name: "list_products",
		description: "List all available products from the catalog. Optionally filter by featured products only.",
		inputSchema: zodToJsonSchema(ListProductsSchema) as Tool["inputSchema"],
	},
	{
		name: "get_product_details",
		description:
			"Get detailed information about a specific product including price, description, images, and specifications.",
		inputSchema: zodToJsonSchema(GetProductSchema) as Tool["inputSchema"],
	},
	{
		name: "search_products_by_category",
		description: "Search products within a specific category. Returns matching products with their details.",
		inputSchema: zodToJsonSchema(SearchProductsSchema) as Tool["inputSchema"],
	},
	{
		name: "get_categories",
		description: "Get all product categories available in the store.",
		inputSchema: zodToJsonSchema(GetCategoriesSchema) as Tool["inputSchema"],
	},
	{
		name: "list_articles",
		description: "List all available articles. Optionally filter by featured articles only.",
		inputSchema: zodToJsonSchema(ListArticlesSchema) as Tool["inputSchema"],
	},
	{
		name: "get_article",
		description: "Get full content of a specific article by ID and language.",
		inputSchema: zodToJsonSchema(GetArticleSchema) as Tool["inputSchema"],
	},
	{
		name: "list_tutorials",
		description: "List all available tutorials. Optionally filter by featured tutorials only.",
		inputSchema: zodToJsonSchema(ListTutorialsSchema) as Tool["inputSchema"],
	},
	{
		name: "get_tutorial",
		description: "Get full content of a specific tutorial by ID and language including difficulty and duration.",
		inputSchema: zodToJsonSchema(GetTutorialSchema) as Tool["inputSchema"],
	},
	{
		name: "register_user",
		description: "Register a new user account with email and password. Returns user UID on success.",
		inputSchema: zodToJsonSchema(RegisterUserSchema) as Tool["inputSchema"],
	},
	{
		name: "create_stripe_checkout",
		description:
			"Create a Stripe checkout session for purchasing products. Provide product UUIDs and quantities; product details (name, price) are fetched automatically. Returns a URL to redirect the user to complete payment.",
		inputSchema: zodToJsonSchema(CreateCheckoutSchema) as Tool["inputSchema"],
	},
];

// ── Server factory ────────────────────────────────────────────────────

function createServer() {
	const server = new Server({ name: config.name, version: config.version }, { capabilities: { tools: {} } });

	server.setRequestHandler(ListToolsRequestSchema, async () => {
		return { tools: TOOLS };
	});

	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args } = request.params;
		try {
			switch (name) {
				case "list_products":
					return await listProducts(ListProductsSchema.parse(args));
				case "get_product_details":
					return await getProductDetails(GetProductSchema.parse(args));
				case "search_products_by_category":
					return await searchProductsByCategory(SearchProductsSchema.parse(args));
				case "get_categories":
					return await getCategories(GetCategoriesSchema.parse(args));
				case "list_articles":
					return await listArticles(ListArticlesSchema.parse(args));
				case "get_article":
					return await getArticle(GetArticleSchema.parse(args));
				case "list_tutorials":
					return await listTutorials(ListTutorialsSchema.parse(args));
				case "get_tutorial":
					return await getTutorial(GetTutorialSchema.parse(args));
				case "register_user":
					return await registerUser(RegisterUserSchema.parse(args));
				case "create_stripe_checkout":
					return await createStripeCheckout(CreateCheckoutSchema.parse(args));
				default:
					return {
						content: [{ type: "text" as const, text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
						isError: true,
					};
			}
		} catch (error) {
			if (error instanceof Error && error.name === "ZodError") {
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({ error: "Invalid arguments", details: error.message }, null, 2),
						},
					],
					isError: true,
				};
			}
			throw error;
		}
	});

	return server;
}

// ── CORS ──────────────────────────────────────────────────────────────

function setCorsHeaders(res: http.ServerResponse) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Mcp-Session-Id");
}

// ── Streamable HTTP ───────────────────────────────────────────────────

const streamableSessions = new Map<string, StreamableHTTPServerTransport>();

async function handleMcp(req: http.IncomingMessage, res: http.ServerResponse) {
	const sessionId = req.headers["mcp-session-id"] as string | undefined;
	let transport: StreamableHTTPServerTransport;

	if (sessionId && streamableSessions.has(sessionId)) {
		transport = streamableSessions.get(sessionId)!;
	} else {
		transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: () => crypto.randomUUID(),
			onsessioninitialized: (id: string) => {
				streamableSessions.set(id, transport);
			},
		});
		transport.onclose = () => {
			if (transport.sessionId) streamableSessions.delete(transport.sessionId);
		};
		const server = createServer();
		await server.connect(transport);
	}

	await transport.handleRequest(req, res);
}

// ── HTTP Server ───────────────────────────────────────────────────────

validateConfig();

const PORT = parseInt(process.env.PORT || "3001", 10);

const httpServer = http.createServer(async (req, res) => {
	setCorsHeaders(res);

	if (req.method === "OPTIONS") {
		res.writeHead(200).end();
		return;
	}

	const pathname = new URL(req.url || "/", `http://${req.headers.host}`).pathname;

	try {
		if (pathname === "/mcp") {
			await handleMcp(req, res);
		} else if (pathname === "/health") {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ status: "ok", server: config.name, version: config.version }));
		} else if (pathname === "/.well-known/mcp") {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(
				JSON.stringify({
					mcp_version: "2025-06-18",
					name: "Sychev Lab MCP Server",
					description: "Accede al catalogo de modelos 3D de Sychev Lab: airsoft, automocion y electronica",
					endpoints: {
						streamable_http: `${config.baseUrl}/mcp`,
					},
					capabilities: { tools: {} },
				}),
			);
		} else {
			res.writeHead(404, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Not found" }));
		}
	} catch (error) {
		console.error("HTTP error:", error);
		if (!res.headersSent) {
			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Internal server error" }));
		}
	}
});

httpServer.listen(PORT, () => {
	console.log(`Sychev Lab MCP Server v${config.version}`);
	console.log(`Connected to: ${config.baseUrl}`);
	console.log(`HTTP transport running on port ${PORT}`);
	console.log(`\nEndpoints:`);
	console.log(`  POST/DELETE http://localhost:${PORT}/mcp     (Streamable HTTP)`);
	console.log(`  GET         http://localhost:${PORT}/health  (Health Check)`);
	console.log(`  GET         http://localhost:${PORT}/.well-known/mcp (Discovery)`);
});
