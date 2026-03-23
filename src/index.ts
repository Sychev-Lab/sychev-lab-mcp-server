#!/usr/bin/env node

/**
 * Sychev Lab MCP Server
 * 
 * Supports both stdio (for Claude Desktop) and HTTP (for remote clients) transports
 * 
 * Usage:
 *   node dist/index.js              # Run with stdio transport (default)
 *   node dist/index.js --http       # Run with HTTP transport
 *   node dist/index.js --http 3000  # Run HTTP on port 3000
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { validateConfig, config } from './config.js';
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
} from './tools.js';

// Tool definitions with schemas
const TOOLS: Tool[] = [
    {
        name: 'list_products',
        description: 'List all available products from the catalog. Optionally filter by featured products only.',
        inputSchema: zodToJsonSchema(ListProductsSchema) as Tool['inputSchema'],
    },
    {
        name: 'get_product_details',
        description: 'Get detailed information about a specific product including price, description, images, and specifications.',
        inputSchema: zodToJsonSchema(GetProductSchema) as Tool['inputSchema'],
    },
    {
        name: 'search_products_by_category',
        description: 'Search products within a specific category. Returns matching products with their details.',
        inputSchema: zodToJsonSchema(SearchProductsSchema) as Tool['inputSchema'],
    },
    {
        name: 'get_categories',
        description: 'Get all product categories available in the store.',
        inputSchema: zodToJsonSchema(GetCategoriesSchema) as Tool['inputSchema'],
    },
    {
        name: 'list_articles',
        description: 'List all available articles. Optionally filter by featured articles only.',
        inputSchema: zodToJsonSchema(ListArticlesSchema) as Tool['inputSchema'],
    },
    {
        name: 'get_article',
        description: 'Get full content of a specific article by ID and language.',
        inputSchema: zodToJsonSchema(GetArticleSchema) as Tool['inputSchema'],
    },
    {
        name: 'list_tutorials',
        description: 'List all available tutorials. Optionally filter by featured tutorials only.',
        inputSchema: zodToJsonSchema(ListTutorialsSchema) as Tool['inputSchema'],
    },
    {
        name: 'get_tutorial',
        description: 'Get full content of a specific tutorial by ID and language including difficulty and duration.',
        inputSchema: zodToJsonSchema(GetTutorialSchema) as Tool['inputSchema'],
    },
    {
        name: 'register_user',
        description: 'Register a new user account with email and password. Returns user UID on success.',
        inputSchema: zodToJsonSchema(RegisterUserSchema) as Tool['inputSchema'],
    },
    {
        name: 'create_stripe_checkout',
        description: 'Create a Stripe checkout session for purchasing products. Provide product UUIDs and quantities; product details (name, price) are fetched automatically. Returns a URL to redirect the user to complete payment.',
        inputSchema: zodToJsonSchema(CreateCheckoutSchema) as Tool['inputSchema'],
    },
];

// Create MCP server
const server = new Server(
    {
        name: config.name,
        version: config.version,
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case 'list_products':
                return await listProducts(ListProductsSchema.parse(args));

            case 'get_product_details':
                return await getProductDetails(GetProductSchema.parse(args));

            case 'search_products_by_category':
                return await searchProductsByCategory(SearchProductsSchema.parse(args));

            case 'get_categories':
                return await getCategories(GetCategoriesSchema.parse(args));

            case 'list_articles':
                return await listArticles(ListArticlesSchema.parse(args));

            case 'get_article':
                return await getArticle(GetArticleSchema.parse(args));

            case 'list_tutorials':
                return await listTutorials(ListTutorialsSchema.parse(args));

            case 'get_tutorial':
                return await getTutorial(GetTutorialSchema.parse(args));

            case 'register_user':
                return await registerUser(RegisterUserSchema.parse(args));

            case 'create_stripe_checkout':
                return await createStripeCheckout(CreateCheckoutSchema.parse(args));

            default:
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ error: `Unknown tool: ${name}` }),
                    }],
                    isError: true,
                };
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: 'Invalid arguments',
                        details: error.message,
                    }, null, 2),
                }],
                isError: true,
            };
        }

        throw error;
    }
});

// Run server with stdio transport
async function runStdioServer() {
    validateConfig();

    const transport = new StdioServerTransport();

    // Log to stderr so it doesn't interfere with stdio communication
    console.error(`Sychev Lab MCP Server v${config.version}`);
    console.error(`Connected to: ${config.baseUrl}`);
    console.error('Running with stdio transport...');

    await server.connect(transport);
}

// Run server with HTTP transport
async function runHttpServer(port: number) {
    validateConfig();

    const http = await import('http');
    const url = await import('url');

    // API key is optional - only used if MCP_API_KEY is set
    const API_KEY = process.env.MCP_API_KEY;

    const httpServer = http.createServer(async (req, res) => {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        // Only accept POST requests
        if (req.method !== 'POST') {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
        }

        // Check API key only if configured
        if (API_KEY) {
            const authHeader = req.headers['authorization'] || '';
            const apiKey = authHeader.replace('Bearer ', '');

            if (apiKey !== API_KEY) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
        }

        // Parse URL
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname;

        // Read body
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                // Parse body for tool calls, empty body is ok for list
                let requestData: { name?: string; arguments?: Record<string, unknown> } = {};
                if (body.trim()) {
                    requestData = JSON.parse(body);
                }

                if (pathname === '/mcp/v1/tools/list') {
                    // List tools
                    res.writeHead(200);
                    res.end(JSON.stringify({ tools: TOOLS }));
                } else if (pathname === '/mcp/v1/tools/call') {
                    // Call tool
                    const { name, arguments: args } = requestData;
                    let result;

                    try {
                        switch (name) {
                            case 'list_products':
                                result = await listProducts(ListProductsSchema.parse(args));
                                break;
                            case 'get_product_details':
                                result = await getProductDetails(GetProductSchema.parse(args));
                                break;
                            case 'search_products_by_category':
                                result = await searchProductsByCategory(SearchProductsSchema.parse(args));
                                break;
                            case 'get_categories':
                                result = await getCategories(GetCategoriesSchema.parse(args));
                                break;
                            case 'list_articles':
                                result = await listArticles(ListArticlesSchema.parse(args));
                                break;
                            case 'get_article':
                                result = await getArticle(GetArticleSchema.parse(args));
                                break;
                            case 'list_tutorials':
                                result = await listTutorials(ListTutorialsSchema.parse(args));
                                break;
                            case 'get_tutorial':
                                result = await getTutorial(GetTutorialSchema.parse(args));
                                break;
                            case 'register_user':
                                result = await registerUser(RegisterUserSchema.parse(args));
                                break;
                            case 'create_stripe_checkout':
                                result = await createStripeCheckout(CreateCheckoutSchema.parse(args));
                                break;
                            default:
                                result = {
                                    content: [{
                                        type: 'text',
                                        text: JSON.stringify({ error: `Unknown tool: ${name}` }),
                                    }],
                                    isError: true,
                                };
                        }
                    } catch (error) {
                        if (error instanceof Error && error.name === 'ZodError') {
                            result = {
                                content: [{
                                    type: 'text',
                                    text: JSON.stringify({
                                        error: 'Invalid arguments',
                                        details: error.message,
                                    }, null, 2),
                                }],
                                isError: true,
                            };
                        } else {
                            throw error;
                        }
                    }

                    res.writeHead(200);
                    res.end(JSON.stringify(result));
                } else {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Not found' }));
                }
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({
                    error: 'Internal server error',
                    message: error instanceof Error ? error.message : 'Unknown error',
                }));
            }
        });
    });

    httpServer.listen(port, () => {
        console.log(`Sychev Lab MCP Server v${config.version}`);
        console.log(`Connected to: ${config.baseUrl}`);
        console.log(`HTTP transport running on port ${port}`);
        console.log(`\nEndpoints:`);
        console.log(`  POST http://localhost:${port}/mcp/v1/tools/list`);
        console.log(`  POST http://localhost:${port}/mcp/v1/tools/call`);
        console.log(`  Content-Type: application/json`);
        if (API_KEY) {
            console.log(`\nAuthentication required:`);
            console.log(`  Authorization: Bearer <MCP_API_KEY>`);
        }
    });
}

// Parse command line arguments
const args = process.argv.slice(2);
const useHttp = args.includes('--http');
const httpPortIndex = args.indexOf('--http');
const httpPort = httpPortIndex !== -1 && args[httpPortIndex + 1]
    ? parseInt(args[httpPortIndex + 1], 10)
    : 3000;

if (useHttp) {
    runHttpServer(httpPort).catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
} else {
    runStdioServer().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
