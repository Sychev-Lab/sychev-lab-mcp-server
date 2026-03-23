/**
 * MCP Tools for Sychev Lab
 */

import { z } from 'zod';
import { apiClient } from './client.js';

// Tool schemas
export const GetProductSchema = z.object({
    productId: z.string().uuid().describe('UUID del producto'),
    lang: z.enum(['es', 'en']).optional().describe('Código de idioma (es o en)'),
});

export const SearchProductsSchema = z.object({
    categoryId: z.string().optional().describe('Término de búsqueda (busca en nombre, descripción, categoría, tags). Opcional - si no se proporciona devuelve todos los productos'),
    limit: z.number().int().min(1).max(100).optional().describe('Número máximo de resultados (default: 30)'),
});

export const GetArticleSchema = z.object({
    articleId: z.string().uuid().describe('UUID del artículo'),
    lang: z.enum(['es', 'en']).describe('Código de idioma (es o en)'),
});

export const GetTutorialSchema = z.object({
    tutorialId: z.string().uuid().describe('UUID del tutorial'),
    lang: z.enum(['es', 'en']).describe('Código de idioma (es o en)'),
});

export const GetCategoriesSchema = z.object({
    includeProducts: z.boolean().optional().describe('Incluir conteo de productos por categoría'),
});

export const RegisterUserSchema = z.object({
    email: z.string().email().describe('Email del usuario'),
    password: z.string().min(6).describe('Contraseña (mínimo 6 caracteres)'),
    displayName: z.string().optional().describe('Nombre visible del usuario (opcional)'),
});

export const CreateCheckoutSchema = z.object({
    productId: z.string().uuid().describe('UUID del producto a comprar'),
    quantity: z.number().int().min(1).max(10).optional().describe('Cantidad (default: 1, max: 10)'),
    guestEmail: z.string().email().optional().describe('Email del invitado (opcional)'),
    guestName: z.string().optional().describe('Nombre del invitado (opcional)'),
    locale: z.enum(['es', 'en']).optional().describe('Locale para emails (default: es)'),
});

export const ListProductsSchema = z.object({
    limit: z.number().int().min(1).max(100).optional().describe('Número máximo de resultados (default: 30)'),
    featuredOnly: z.boolean().optional().describe('Solo productos destacados'),
});

export const ListArticlesSchema = z.object({
    limit: z.number().int().min(1).max(100).optional().describe('Número máximo de resultados'),
    featuredOnly: z.boolean().optional().describe('Solo artículos destacados'),
});

export const ListTutorialsSchema = z.object({
    limit: z.number().int().min(1).max(100).optional().describe('Número máximo de resultados'),
    featuredOnly: z.boolean().optional().describe('Solo tutoriales destacados'),
});

// Tool implementations
export async function getProductDetails(args: z.infer<typeof GetProductSchema>) {
    try {
        const product = await apiClient.getProduct(args.productId, args.lang || 'es');
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ success: true, product }, null, 2),
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to fetch product'
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function searchProductsByCategory(args: z.infer<typeof SearchProductsSchema>) {
    try {
        // If no category provided, return all products (limited)
        let products: any[] = [];
        if (args.categoryId) {
            products = await apiClient.searchProductsByCategory(args.categoryId, args.limit || 30);
        } else {
            const response = await apiClient.getProducts();
            products = Array.isArray(response) ? response :
                (response && typeof response === 'object' && 'products' in response) ?
                    (response as any).products :
                    (response && typeof response === 'object' && 'data' in response) ?
                        (response as any).data : [];
            if (args.limit) {
                products = products.slice(0, args.limit);
            } else {
                products = products.slice(0, 30);
            }
        }
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    products,
                    total: products.length,
                    searchTerm: args.categoryId || 'all',
                }, null, 2),
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error instanceof Error ? error.message : 'Search failed'
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function getArticle(args: z.infer<typeof GetArticleSchema>) {
    try {
        const article = await apiClient.getArticle(args.articleId, args.lang);
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ success: true, article }, null, 2),
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to fetch article'
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function getTutorial(args: z.infer<typeof GetTutorialSchema>) {
    try {
        const tutorial = await apiClient.getTutorial(args.tutorialId, args.lang);
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({ success: true, tutorial }, null, 2),
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to fetch tutorial'
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function getCategories(args: z.infer<typeof GetCategoriesSchema>) {
    try {
        const response = await apiClient.getCategories();
        const categories = response?.data?.categories || [];
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    categories,
                    count: categories.length,
                }, null, 2),
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to fetch categories'
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function listProducts(args: z.infer<typeof ListProductsSchema>) {
    try {
        const response = await apiClient.getProducts();

        // Handle case where API returns an object with products or data property
        let products = Array.isArray(response) ? response :
            (response && typeof response === 'object' && 'products' in response) ?
                (response as any).products :
                (response && typeof response === 'object' && 'data' in response) ?
                    (response as any).data : [];

        if (args.featuredOnly) {
            products = products.filter((p: any) => p.featured);
        }

        // Apply limit (default 30)
        const limit = args.limit || 30;
        products = products.slice(0, limit);

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    products,
                    total: products.length,
                }, null, 2),
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to list products'
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function listArticles(args: z.infer<typeof ListArticlesSchema>) {
    try {
        let articles = await apiClient.getArticles();

        if (args.featuredOnly) {
            articles = articles.filter(a => a.featured);
        }

        if (args.limit) {
            articles = articles.slice(0, args.limit);
        }

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    articles,
                    total: articles.length,
                }, null, 2),
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to list articles'
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function listTutorials(args: z.infer<typeof ListTutorialsSchema>) {
    try {
        let tutorials = await apiClient.getTutorials();

        if (args.featuredOnly) {
            tutorials = tutorials.filter(t => t.featured);
        }

        if (args.limit) {
            tutorials = tutorials.slice(0, args.limit);
        }

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    tutorials,
                    total: tutorials.length,
                }, null, 2),
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to list tutorials'
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function registerUser(args: z.infer<typeof RegisterUserSchema>) {
    try {
        const result = await apiClient.registerUser(
            args.email,
            args.password,
            args.displayName
        );
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    message: result.message,
                    user: result.user,
                }, null, 2),
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error instanceof Error ? error.message : 'Registration failed'
                }, null, 2),
            }],
            isError: true,
        };
    }
}

export async function createStripeCheckout(args: z.infer<typeof CreateCheckoutSchema>) {
    try {
        // Usar el endpoint seguro que obtiene los datos del producto desde Firestore
        const result = await apiClient.createCheckoutSecure(
            args.productId,
            args.quantity || 1,
            {
                guestEmail: args.guestEmail,
                guestName: args.guestName,
                locale: args.locale,
            }
        );

        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    sessionId: result.sessionId,
                    url: result.url,
                    product: {
                        id: result.product.id,
                        name: result.product.name,
                        price: result.product.price,
                        currency: result.product.currency,
                        type: result.product.type,
                    },
                    message: 'Checkout session created successfully. Redirect user to the URL to complete payment.',
                }, null, 2),
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    error: error instanceof Error ? error.message : 'Checkout failed'
                }, null, 2),
            }],
            isError: true,
        };
    }
}
