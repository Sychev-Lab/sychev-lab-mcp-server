/**
 * Configuration for Sychev Lab MCP Server
 */

export interface ServerConfig {
    baseUrl: string;
    name: string;
    version: string;
}

// Always use production URL
export const config: ServerConfig = {
    baseUrl: 'https://lab.sychev.xyz',
    name: 'sychev-lab-mcp',
    version: '1.0.7'
};

// Validate configuration
export function validateConfig(): void {
    try {
        new URL(config.baseUrl);
    } catch {
        throw new Error(`Invalid base URL: ${config.baseUrl}`);
    }
}
