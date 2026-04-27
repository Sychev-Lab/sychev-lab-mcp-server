# Sychev Lab MCP Server

[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue)](https://lab.sychev.xyz/mcp)

Servidor MCP (Model Context Protocol) para Sychev Lab - proporciona acceso a productos, artículos, tutoriales y funciones de comercio electrónico.

## 🤖 MCP Server — AI Integration

**Claude.ai / Web:**
Añade en Settings → Integrations: `https://lab.sychev.xyz/mcp`

**Claude Desktop / Cursor:**

```json
{
	"mcpServers": {
		"sychev-lab": {
			"command": "npx",
			"args": ["-y", "sychev-lab-mcp-server"],
			"env": {
				"SYCHEV_LAB_URL": "https://lab.sychev.xyz"
			}
		}
	}
}
```

**Endpoints HTTP:**

- `POST/DELETE /mcp` — Streamable HTTP (estándar MCP 2025-06-18)
- `GET /.well-known/mcp` — Descubrimiento automático

## Características

- **Catálogo de Productos**: Listar, buscar y obtener detalles de productos STL para impresión 3D
- **Artículos**: Acceso a artículos técnicos y de blog
- **Tutoriales**: Tutoriales paso a paso con información de dificultad y duración
- **Categorías**: Navegación por categorías de productos
- **Usuarios**: Registro de nuevos usuarios
- **Checkout**: Creación de sesiones de pago con Stripe

## Herramientas Disponibles

| Herramienta                   | Descripción                                  |
| ----------------------------- | -------------------------------------------- |
| `list_products`               | Lista todos los productos disponibles        |
| `get_product_details`         | Obtiene información detallada de un producto |
| `search_products_by_category` | Busca productos por categoría o término      |
| `get_categories`              | Obtiene todas las categorías disponibles     |
| `list_articles`               | Lista todos los artículos                    |
| `get_article`                 | Obtiene el contenido completo de un artículo |
| `list_tutorials`              | Lista todos los tutoriales                   |
| `get_tutorial`                | Obtiene el contenido completo de un tutorial |
| `register_user`               | Registra un nuevo usuario                    |
| `create_stripe_checkout`      | Crea una sesión de checkout de Stripe        |

## Instalación

```bash
npm install
npm run build
```

## Uso

### Modo stdio (para Claude Desktop)

```bash
npm start
# o
node dist/index.js
```

### Modo HTTP (Streamable HTTP)

```bash
npm run start:http
# o
PORT=3001 node dist/server-http.js
```

Endpoints disponibles:

- `POST/DELETE /mcp` - Streamable HTTP (estandar MCP 2025-06-18)
- `GET /health` - Health check
- `GET /.well-known/mcp` - Descubrimiento automatico

### Modo HTTP Legacy

```bash
npm run start:http:legacy
# o
node dist/index.js --http 3000
```

### Variables de Entorno

| Variable         | Descripción                     | Default                  |
| ---------------- | ------------------------------- | ------------------------ |
| `SYCHEV_LAB_URL` | URL base de la API              | `https://lab.sychev.xyz` |
| `MCP_API_KEY`    | API key opcional para modo HTTP | -                        |

## Configuración con Claude Desktop

Añade a tu configuración de Claude Desktop (`claude_desktop_config.json`):

```json
{
	"mcpServers": {
		"sychev-lab": {
			"command": "npx",
			"args": ["-y", "sychev-lab-mcp-server"],
			"env": {
				"SYCHEV_LAB_URL": "https://lab.sychev.xyz"
			}
		}
	}
}
```

O instala globalmente:

```bash
npm install -g sychev-lab-mcp-server
```

## Endpoints HTTP

Cuando se ejecuta en modo HTTP (`npm run start:http`):

- `POST /mcp` - Streamable HTTP (estandar MCP 2025-06-18)
- `DELETE /mcp` - Cerrar sesion Streamable HTTP
- `GET /health` - Health check
- `GET /.well-known/mcp` - Descubrimiento automatico

Headers:

```
Content-Type: application/json
Mcp-Session-Id: <session-id>
```

## Scripts

| Script               | Descripción                |
| -------------------- | -------------------------- |
| `npm run build`      | Compila TypeScript         |
| `npm run dev`        | Compila en modo watch      |
| `npm start`          | Inicia el servidor (stdio) |
| `npm run start:http` | Inicia el servidor HTTP    |
| `npm run inspector`  | Ejecuta el inspector MCP   |
| `npm run lint`       | Ejecuta ESLint             |
| `npm run typecheck`  | Verifica tipos sin emitir  |

## Estructura del Proyecto

```
src/
├── index.ts    # Punto de entrada y servidor MCP
├── tools.ts    # Definiciones e implementaciones de herramientas
├── client.ts   # Cliente HTTP para la API de Sychev Lab
└── config.ts   # Configuración del servidor
```

## Licencia

MIT
