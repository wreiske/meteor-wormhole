import { sanitizeToolName } from './mcp-bridge';

/**
 * Generate an OpenAPI 3.1.0 specification from the method registry.
 * @param {import('./registry').MethodRegistry} registry - The method registry
 * @param {object} options - Configuration options
 * @param {string} [options.name='meteor-wormhole'] - API title
 * @param {string} [options.version='1.0.0'] - API version
 * @param {string} [options.restPath='/api'] - Base path for REST endpoints
 * @param {string|null} [options.apiKey=null] - Whether API key auth is enabled
 * @param {boolean} [options.sessionAuth=false] - Whether Meteor login tokens are accepted as Bearer tokens
 * @param {string} [options.description] - API description
 * @returns {object} OpenAPI 3.1.0 specification object
 * @throws {Error} If two method names sanitize to the same route (path key collision)
 */
export function generateOpenApiSpec(registry, options = {}) {
  const name = options.name || 'meteor-wormhole';
  const version = options.version || '1.0.0';
  const restPath = options.restPath || '/api';
  const description =
    options.description ||
    `REST API for Meteor methods exposed via ${name}. ` +
      "Each endpoint maps to a Meteor method and accepts a JSON body matching the method's input schema.";

  const spec = {
    openapi: '3.1.0',
    info: {
      title: name,
      version,
      description,
    },
    servers: [{ url: restPath }],
    paths: {},
  };

  // Security schemes: `bearerAuth` is the service API key, `sessionAuth` a
  // Meteor login token. Both travel as `Authorization: Bearer`, but they are
  // modelled separately because `auth: 'required'` operations accept only a
  // user session — an API key gets 401 there.
  const hasAuth = !!(options.apiKey || options.sessionAuth);
  const apiKeyRequirement = { bearerAuth: [] };
  const sessionRequirement = { sessionAuth: [] };
  if (hasAuth) {
    const securitySchemes = {};
    if (options.apiKey) {
      securitySchemes.bearerAuth = {
        type: 'http',
        scheme: 'bearer',
        description: 'Service API key passed as a Bearer token',
      };
    }
    if (options.sessionAuth) {
      securitySchemes.sessionAuth = {
        type: 'http',
        scheme: 'bearer',
        description: 'Meteor login token of a signed-in user passed as a Bearer token',
      };
    }
    spec.components = { securitySchemes };
    if (options.apiKey) {
      spec.security = [apiKeyRequirement];
      if (options.sessionAuth) spec.security.push(sessionRequirement);
    }
  }

  const methods = registry.getAll();

  for (const [methodName, config] of methods) {
    const routeName = sanitizeToolName(methodName);
    const pathKey = `/${routeName}`;

    if (spec.paths[pathKey]) {
      const existingOperationId =
        spec.paths[pathKey].post && spec.paths[pathKey].post.operationId
          ? spec.paths[pathKey].post.operationId
          : 'unknown-method';
      throw new Error(
        `Duplicate OpenAPI path key '${pathKey}' generated from Meteor methods ` +
          `'${existingOperationId}' and '${methodName}'. ` +
          'Ensure method names sanitize to unique route names or adjust sanitizeToolName().',
      );
    }

    const policy = config.auth || 'optional';
    const operation = {
      summary: config.description || `Call Meteor method: ${methodName}`,
      operationId: routeName,
      tags: [deriveTag(methodName)],
      'x-meteor-method': methodName,
      'x-wormhole-auth': policy,
      responses: {
        200: {
          description: 'Successful method call',
          content: {
            'application/json': {
              schema: config.outputSchema
                ? {
                    type: 'object',
                    properties: {
                      result: config.outputSchema,
                    },
                  }
                : {
                    type: 'object',
                    description: 'The return value of the Meteor method, JSON-encoded.',
                    properties: {
                      result: { description: 'Method return value' },
                    },
                  },
            },
          },
        },
        400: {
          description: 'Invalid request body or validation error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        401: {
          description: 'Unauthorized — missing, invalid or expired credentials',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        403: {
          description: 'Forbidden — the method rejected the caller (e.g. not-authorized)',
          content: { 'application/json': { schema: errorSchema() } },
        },
        404: {
          description: 'Not found — unknown route or the method reported not-found',
          content: { 'application/json': { schema: errorSchema() } },
        },
        409: {
          description: 'Conflict — the method reported already-exists / account-exists',
          content: { 'application/json': { schema: errorSchema() } },
        },
        429: {
          description: 'Rate limited',
          content: { 'application/json': { schema: errorSchema() } },
        },
        500: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' },
                  reason: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    };

    // Build request body from inputSchema
    if (config.inputSchema) {
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: config.inputSchema,
          },
        },
      };
    } else {
      // Generic args-array schema for methods without explicit schemas
      operation.requestBody = {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                args: {
                  type: 'array',
                  items: {},
                  description: 'Arguments to pass to the Meteor method',
                },
              },
            },
          },
        },
      };
    }

    if (hasAuth) {
      if (policy === 'none') {
        operation.security = [];
      } else if (policy === 'required') {
        // Only a signed-in user satisfies 'required'; an API key is rejected.
        operation.security = options.sessionAuth ? [sessionRequirement] : [];
      } else if (options.apiKey) {
        // optional behind an apiKey gate: service key or (when enabled) a user session
        operation.security = options.sessionAuth
          ? [apiKeyRequirement, sessionRequirement]
          : [apiKeyRequirement];
      } else {
        // optional without a gate: anonymous or authenticated
        operation.security = [{}, sessionRequirement];
      }
    }

    spec.paths[pathKey] = { post: operation };
  }

  return spec;
}

function errorSchema() {
  return {
    type: 'object',
    properties: {
      error: { type: 'string' },
      reason: { type: 'string' },
      message: { type: 'string' },
    },
  };
}

/**
 * Derive a tag name from a method name for OpenAPI grouping.
 * Uses the first segment before a dot, or 'general' if no dot.
 * @param {string} methodName - Meteor method name
 * @returns {string} Tag name
 */
function deriveTag(methodName) {
  const dotIndex = methodName.indexOf('.');
  if (dotIndex > 0) {
    return methodName.substring(0, dotIndex);
  }
  return 'general';
}
