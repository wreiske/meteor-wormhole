import { sanitizeToolName } from './mcp-bridge';

/**
 * Generate an OpenAPI 3.1.0 specification from the method registry.
 * @param {import('./registry').MethodRegistry} registry - The method registry
 * @param {object} options - Configuration options
 * @param {string} [options.name='meteor-wormhole'] - API title
 * @param {string} [options.version='1.0.0'] - API version
 * @param {string} [options.restPath='/api'] - Base path for REST endpoints
 * @param {string|null} [options.apiKey=null] - Whether API key auth is enabled
 * @param {string} [options.description] - API description
 * @returns {object} OpenAPI 3.1.0 specification object
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

  // Add security scheme if API key is configured
  if (options.apiKey) {
    spec.components = {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'API key passed as a Bearer token',
        },
      },
    };
    spec.security = [{ bearerAuth: [] }];
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

    const operation = {
      summary: config.description || `Call Meteor method: ${methodName}`,
      operationId: routeName,
      tags: [deriveTag(methodName)],
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
          description: 'Unauthorized — missing or invalid API key',
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
        500: {
          description: 'Meteor method error or internal server error',
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

    spec.paths[pathKey] = { post: operation };
  }

  return spec;
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
