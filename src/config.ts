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
    version: '1.0.5'
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
}
