/**
 * HTTP Client for Sychev Lab API
 */

import { config } from './config.js';

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    images: string[];
    category: string;
    tags: string[];
    slug?: string;
    thumbnail?: string;
    type?: string;
    featured?: boolean;
}

export interface Article {
    id: string;
    title: string;
    content: string;
    author: string;
    published_at: string;
    tags: string[];
    slug?: string;
    description?: string;
    thumbnail?: string;
    type?: string;
    featured?: boolean;
    path?: string;
}

export interface Tutorial {
    id: string;
    title: string;
    content: string;
    author: string;
    published_at: string;
    tags: string[];
    difficulty: string;
    duration: string;
    slug?: string;
    description?: string;
    thumbnail?: string;
    type?: string;
    featured?: boolean;
    path?: string;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    parent?: string;
    children?: Category[];
}

export interface CheckoutSession {
    sessionId: string;
    url: string;
}

export interface CheckoutItem {
    id: string;
    title: string;
    price: number;
    quantity?: number;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    private async fetch<T>(endpoint: string): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        return response.json() as Promise<T>;
    }

    private async post<T>(endpoint: string, body: unknown): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
            throw new Error(error.message || `API error: ${response.status}`);
        }

        return response.json() as Promise<T>;
    }

    // Products
    async getProducts(): Promise<Product[]> {
        return this.fetch<Product[]>('/api/lab/products/index.json');
    }

    async getProduct(id: string, lang: string = 'es'): Promise<Product> {
        return this.fetch<Product>(`/api/lab/products/${id}.${lang}.json`);
    }

    // Articles
    async getArticles(): Promise<Article[]> {
        return this.fetch<Article[]>('/api/lab/index.articles.json');
    }

    async getArticle(id: string, lang: string): Promise<Article> {
        return this.fetch<Article>(`/api/lab/articles/${id}.${lang}.json`);
    }

    // Tutorials
    async getTutorials(): Promise<Tutorial[]> {
        return this.fetch<Tutorial[]>('/api/lab/index.tutorials.json');
    }

    async getTutorial(id: string, lang: string): Promise<Tutorial> {
        return this.fetch<Tutorial>(`/api/lab/tutorials/${id}.${lang}.json`);
    }

    // Categories
    async getCategories(): Promise<{ data: { categories: Category[] } }> {
        return this.fetch<{ data: { categories: Category[] } }>('/api/lab/categories.json');
    }

    // Search products by category (fuzzy search)
    async searchProductsByCategory(searchTerm: string, limit: number = 20): Promise<Product[]> {
        const response = await this.getProducts();
        // Handle case where API returns an object with products or data property
        const products = Array.isArray(response) ? response :
            (response && typeof response === 'object' && 'products' in response) ?
                (response as any).products :
                (response && typeof response === 'object' && 'data' in response) ?
                    (response as any).data : [];

        const searchLower = searchTerm.toLowerCase();

        const filtered = products.filter((p: any) => {
            // Search in multiple fields (API uses 'title' instead of 'name')
            const nameMatch = p.name?.toLowerCase().includes(searchLower) ||
                p.title?.toLowerCase().includes(searchLower);
            const descriptionMatch = p.description?.toLowerCase().includes(searchLower);
            // category puede ser string, objeto o array - manejar todos los casos
            let categoryValue = '';
            if (typeof p.category === 'string') {
                categoryValue = p.category;
            } else if (p.category && typeof p.category === 'object') {
                // Es un objeto con propiedad name
                categoryValue = p.category.name || '';
            } else if (Array.isArray(p.category)) {
                categoryValue = p.category.join(' ');
            }
            const categoryMatch = categoryValue.toLowerCase().includes(searchLower);
            const tagsMatch = p.tags?.some((tag: string) =>
                tag.toLowerCase().includes(searchLower)
            );
            const slugMatch = p.slug?.toLowerCase().includes(searchLower);

            return nameMatch || descriptionMatch || categoryMatch || tagsMatch || slugMatch;
        });

        // Sort by relevance (exact matches first, then partial matches)
        const sorted = filtered.sort((a: any, b: any) => {
            const aName = (a.name || a.title || '').toLowerCase();
            const bName = (b.name || b.title || '').toLowerCase();
            const aExact = aName === searchLower;
            const bExact = bName === searchLower;

            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;

            // Then prioritize name starts with search term
            const aStarts = aName.startsWith(searchLower);
            const bStarts = bName.startsWith(searchLower);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            return 0;
        });

        return sorted.slice(0, limit);
    }

    // Checkout (legacy - mantenido para compatibilidad)
    async createCheckout(
        items: CheckoutItem[],
        options?: { guestEmail?: string; locale?: string }
    ): Promise<CheckoutSession> {
        return this.post<CheckoutSession>('/api/stripe/checkout', {
            items,
            guestEmail: options?.guestEmail,
            locale: options?.locale || 'es',
            successUrl: `${this.baseUrl}/checkout/success`,
            cancelUrl: `${this.baseUrl}/checkout/cancel`,
        });
    }

    // Checkout seguro - solo recibe productId, obtiene datos desde Firestore
    async createCheckoutSecure(
        productId: string,
        quantity: number = 1,
        options?: { guestEmail?: string; guestName?: string; locale?: string }
    ): Promise<CheckoutSession & { product: { id: string; name: string; price: number; currency: string; type: string } }> {
        return this.post<CheckoutSession & { product: { id: string; name: string; price: number; currency: string; type: string } }>('/api/stripe/checkout-secure', {
            productId,
            quantity,
            guestEmail: options?.guestEmail,
            guestName: options?.guestName,
            locale: options?.locale || 'es',
            successUrl: `${this.baseUrl}/checkout/success`,
            cancelUrl: `${this.baseUrl}/checkout/cancel`,
        });
    }

    // User Registration
    async registerUser(
        email: string,
        password: string,
        displayName?: string
    ): Promise<{ message: string; user: { uid: string; email: string; displayName?: string } }> {
        return this.post('/api/register', {
            email,
            password,
            displayName,
        });
    }
}

export const apiClient = new ApiClient(config.baseUrl);
