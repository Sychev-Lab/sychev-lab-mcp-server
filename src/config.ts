/**
 * Configuration for Sychev Lab MCP Server
 */

export interface ServerConfig {
    baseUrl: string;
    name: string;
    version: string;
}

// Load from environment or use defaults
export const config: ServerConfig = {
    baseUrl: process.env.SYCHEV_LAB_URL || 'https://lab.sychev.xyz',
    name: 'sychev-lab-mcp',
    version: '1.0.7'
};

// Validate configuration
export function validateConfig(): void {
    if (!config.baseUrl) {
        throw new Error('SYCHEV_LAB_URL environment variable is required');
    }

    try {
        new URL(config.baseUrl);
    } catch {
        throw new Error(`Invalid base URL: ${config.baseUrl}`);
    }

    // Reject localhost without explicit development flag to prevent accidental misconfiguration
    if (config.baseUrl.includes('localhost') && process.env.SYCHEV_LAB_ENV !== 'development') {
        console.warn(`⚠️  Warning: Using localhost as base URL without SYCHEV_LAB_ENV=development.`);
        console.warn(`   To override, set SYCHEV_LAB_URL explicitly or use SYCHEV_LAB_ENV=development.`);
        console.warn(`   Defaulting to production: https://lab.sychev.xyz`);
        config.baseUrl = 'https://lab.sychev.xyz';
    }
}
