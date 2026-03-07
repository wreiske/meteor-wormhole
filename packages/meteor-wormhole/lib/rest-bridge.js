import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import { sanitizeToolName } from './mcp-bridge';
import { generateOpenApiSpec } from './openapi';

/** Maximum allowed request body size in bytes (1 MB). */
const MAX_BODY_SIZE = 1024 * 1024;

/**
 * Parse JSON body from an HTTP request stream.
 * @param {import('http').IncomingMessage} req - HTTP request
 * @returns {Promise<object|undefined>} Parsed JSON body
 * @throws {Error} If the body contains invalid JSON or exceeds the size limit
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType && !contentType.startsWith('application/json')) {
      reject(new Error('Content-Type must be application/json'));
      return;
    }

    let data = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      data += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : undefined);
      } catch (_e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send a JSON response.
 * @param {import('http').ServerResponse} res - HTTP response
 * @param {number} statusCode - HTTP status code
 * @param {object} body - Response body to serialize as JSON
 */
function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

// NOTE: Swagger UI HTML is served inline to avoid depending on swagger-ui-dist.
// This keeps the package lightweight. The HTML loads Swagger UI from a CDN.
const SWAGGER_UI_VERSION = '5.18.2';

/**
 * Generate the Swagger UI HTML page.
 * @param {string} specUrl - URL to the OpenAPI JSON spec
 * @returns {string} HTML string for the Swagger UI page
 */
function swaggerHtml(specUrl) {
  const safeSpecUrl = JSON.stringify(specUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>API Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ url: ${safeSpecUrl}, dom_id: '#swagger-ui' });
  </script>
</body>
</html>`;
}

/**
 * RestBridge exposes registered Meteor methods as REST endpoints
 * and serves an OpenAPI specification + Swagger UI.
 */
export class RestBridge {
  /**
   * @param {import('./registry').MethodRegistry} registry - The method registry
   * @param {object} options - Configuration options
   * @param {string} [options.restPath='/api'] - Base path for REST endpoints
   * @param {string} [options.name='meteor-wormhole'] - API name
   * @param {string} [options.version='1.0.0'] - API version
   * @param {string|null} [options.apiKey=null] - Bearer token for auth
   * @param {boolean} [options.docs=true] - Whether to serve Swagger UI
   */
  constructor(registry, options) {
    this._registry = registry;
    this._options = options;
    this._started = false;
    this._mounted = false;
    this._routeMap = new Map();
    this._buildRouteMap();
    this._unsubscribe = this._registry.onChange(() => this._buildRouteMap());
  }

  /**
   * Start the REST bridge, mounting HTTP handlers on the configured path.
   * Middleware is mounted once and gated on `_started`; subsequent calls are safe.
   * @returns {void}
   */
  start() {
    if (this._started) return;
    this._started = true;

    if (this._mounted) return;
    this._mounted = true;

    const basePath = this._options.restPath || '/api';

    WebApp.connectHandlers.use(basePath, async (req, res, next) => {
      if (!this._started) {
        if (typeof next === 'function') {
          next();
        }
        return;
      }
      try {
        await this._handleRequest(req, res, basePath, next);
      } catch (_err) {
        if (!res.headersSent) {
          sendJson(res, 500, { error: 'internal-error', message: 'Internal server error' });
        }
      }
    });
  }

  /**
   * Stop the REST bridge.
   * @returns {void}
   */
  stop() {
    this._started = false;
  }

  /**
   * Whether the REST bridge is currently running.
   * @returns {boolean}
   */
  get started() {
    return this._started;
  }

  /**
   * Route an incoming HTTP request to the appropriate handler.
   * @param {import('http').IncomingMessage} req - HTTP request
   * @param {import('http').ServerResponse} res - HTTP response
   * @param {string} basePath - The base path for REST endpoints
   * @param {Function} next - Connect middleware next function
   * @returns {Promise<void>}
   */
  async _handleRequest(req, res, basePath, next) {
    // Strip the base path prefix to get the route segment
    const url = req.url.split('?')[0].replace(/\/+$/, '');

    // API key check
    if (this._options.apiKey) {
      // Allow unauthenticated access to docs and spec
      const isDocsRoute = url === '/docs' || url === '/openapi.json';
      if (!isDocsRoute) {
        const authHeader = req.headers['authorization'] || '';
        if (authHeader !== `Bearer ${this._options.apiKey}`) {
          sendJson(res, 401, { error: 'unauthorized', message: 'Invalid or missing API key' });
          return;
        }
      }
    }

    // GET /openapi.json — serve OpenAPI spec
    if (req.method === 'GET' && url === '/openapi.json') {
      const spec = generateOpenApiSpec(this._registry, {
        name: this._options.name,
        version: this._options.version,
        restPath: basePath,
        apiKey: this._options.apiKey,
      });
      sendJson(res, 200, spec);
      return;
    }

    // GET /docs — serve Swagger UI
    if (req.method === 'GET' && url === '/docs') {
      if (this._options.docs === false) {
        sendJson(res, 404, { error: 'not-found', message: 'Swagger UI is disabled' });
        return;
      }
      const specUrl = `${basePath}/openapi.json`;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(swaggerHtml(specUrl));
      return;
    }

    // POST /<toolName> — invoke a Meteor method
    if (req.method === 'POST') {
      const routeName = url.replace(/^\//, '');
      if (!routeName) {
        sendJson(res, 404, {
          error: 'not-found',
          message: 'Method name required. POST to /<methodName>',
        });
        return;
      }
      await this._invokeMethod(routeName, req, res);
      return;
    }

    // GET / — list available endpoints
    if (req.method === 'GET' && (url === '' || url === '/')) {
      const methods = this._registry.getAll();
      const endpoints = [];
      for (const [methodName, config] of methods) {
        const routeName = sanitizeToolName(methodName);
        endpoints.push({
          method: methodName,
          endpoint: `POST ${basePath}/${routeName}`,
          description: config.description || `Meteor method: ${methodName}`,
        });
      }
      sendJson(res, 200, {
        endpoints,
        docs: `GET ${basePath}/docs`,
        spec: `GET ${basePath}/openapi.json`,
      });
      return;
    }

    // Fall through to next middleware for unmatched routes
    if (typeof next === 'function') {
      next();
    } else {
      sendJson(res, 404, { error: 'not-found', message: 'Not found' });
    }
  }

  /**
   * Build a Map<routeName, methodName> for O(1) route lookup.
   * Called on construction and whenever the registry changes.
   * @returns {void}
   */
  _buildRouteMap() {
    this._routeMap.clear();
    const methods = this._registry.getAll();
    for (const [name] of methods) {
      const route = sanitizeToolName(name);
      if (this._routeMap.has(route)) {
        // Collision detected — store an array so we can report it at invocation time
        const existing = this._routeMap.get(route);
        if (Array.isArray(existing)) {
          existing.push(name);
        } else {
          this._routeMap.set(route, [existing, name]);
        }
      } else {
        this._routeMap.set(route, name);
      }
    }
  }

  /**
   * Invoke a Meteor method via its sanitized route name.
   * @param {string} routeName - The sanitized tool/route name
   * @param {import('http').IncomingMessage} req - HTTP request
   * @param {import('http').ServerResponse} res - HTTP response
   * @returns {Promise<void>}
   */
  async _invokeMethod(routeName, req, res) {
    const entry = this._routeMap.get(routeName);

    if (!entry) {
      sendJson(res, 404, { error: 'not-found', message: `No method mapped to: ${routeName}` });
      return;
    }

    // Collision: multiple methods map to the same sanitized route
    if (Array.isArray(entry)) {
      sendJson(res, 500, {
        error: 'ambiguous-route',
        message: `Multiple methods mapped to route: ${routeName}`,
        methods: entry,
      });
      return;
    }

    const methodName = entry;
    const config = this._registry.get(methodName);

    let body;
    try {
      body = await parseBody(req);
    } catch (e) {
      if (e.message === 'Request body too large') {
        sendJson(res, 413, {
          error: 'payload-too-large',
          message: 'Request body exceeds 1 MB limit',
        });
      } else if (e.message === 'Content-Type must be application/json') {
        sendJson(res, 415, {
          error: 'unsupported-media-type',
          message: 'Content-Type must be application/json',
        });
      } else {
        sendJson(res, 400, { error: 'invalid-json', message: 'Request body must be valid JSON' });
      }
      return;
    }

    try {
      let result;
      if (config.inputSchema) {
        // Pass the entire body as a single argument (explicit schema mode)
        result = await Meteor.callAsync(methodName, body || {});
      } else {
        // Generic mode: spread the args array
        const args = (body && body.args) || [];
        result = await Meteor.callAsync(methodName, ...args);
      }
      sendJson(res, 200, { result: result ?? null });
    } catch (error) {
      if (error instanceof Meteor.Error) {
        sendJson(res, 500, {
          error: error.error,
          reason: error.reason || error.message,
          message: error.message,
        });
      } else {
        sendJson(res, 500, {
          error: 'internal-error',
          message: error.message || 'Unknown error',
        });
      }
    }
  }
}
