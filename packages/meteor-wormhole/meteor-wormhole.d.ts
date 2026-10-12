declare module 'meteor/wreiske:meteor-wormhole' {
  import type { IncomingMessage, ServerResponse } from 'http';

  interface RestOptions {
    enabled?: boolean;
    path?: string;
    docs?: boolean;
    /** Serve `<path>/openapi.json`: `true` (default), `false`, or `'auth'` (apiKey or session required). */
    spec?: boolean | 'auth';
    apiKey?: string | null;
  }

  type AuthPolicy = 'required' | 'optional' | 'none';

  interface AuthOptions {
    /** Use accounts-base login tokens (`Authorization: Bearer <token>`). */
    accounts?: boolean;
    /** Custom resolver: return the user id for the request, or null. Overrides `accounts`. */
    resolveUser?: (req: IncomingMessage) => Promise<string | null> | string | null;
  }

  interface ResolvedAuth {
    kind: 'apiKey' | 'session' | 'invalid' | 'none';
    userId: string | null;
    token: string | null;
  }

  interface InvokeHookInfo {
    req: IncomingMessage | null;
    methodName: string;
    userId: string | null;
    auth: ResolvedAuth;
  }

  interface MethodRegistryEntry {
    description: string;
    inputSchema: object | null;
    outputSchema: object | null;
    auth: AuthPolicy;
    registeredAt: number;
  }

  interface MethodRegistry {
    register(name: string, options?: ExposeOptions): void;
    unregister(name: string): boolean;
    get(name: string): MethodRegistryEntry | null;
    getAll(): Map<string, MethodRegistryEntry>;
    has(name: string): boolean;
    size(): number;
    names(): string[];
    onChange(fn: (event: string, ...args: unknown[]) => void): () => void;
  }

  type ConnectHandler = (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: unknown) => void,
  ) => void;

  interface WormholePluginApi<TContext = Record<string, unknown>> {
    registry: MethodRegistry;
    options: WormholeInitOptions;
    context: TContext;
    /** Resolve the caller of a request with Wormhole's configured credentials. */
    auth: { resolve(req: IncomingMessage): Promise<ResolvedAuth> };
    mount(path: string, handler: ConnectHandler): void;
  }

  interface WormholePlugin<TContext = Record<string, unknown>> {
    name: string;
    start(api: WormholePluginApi<TContext>): void | Promise<void>;
    stop?(): void | Promise<void>;
  }

  interface WormholeInitOptions {
    mode?: 'all' | 'opt-in';
    path?: string;
    name?: string;
    version?: string;
    apiKey?: string | null;
    exclude?: Array<string | RegExp>;
    /** Session auth for signed-in users. `true` = accounts-base login tokens. */
    auth?: boolean | AuthOptions;
    /** MCP transport; `{ enabled: false }` mounts no MCP server. */
    mcp?: boolean | { enabled?: boolean };
    rest?: RestOptions | boolean;
    /** Runs before every invocation; throw a Meteor.Error (e.g. 'rate-limited') to reject. */
    onBeforeInvoke?: (info: InvokeHookInfo) => void | Promise<void>;
    context?: Record<string, unknown>;
  }

  interface ExposeOptions {
    description?: string;
    inputSchema?: object;
    outputSchema?: object;
    /** 'required' = signed-in user only, 'optional' (default), 'none' = always anonymous (login methods). */
    auth?: AuthPolicy;
  }

  interface WormholeManager {
    init(options?: WormholeInitOptions): void;
    use<TContext = Record<string, unknown>>(plugin: WormholePlugin<TContext>): void;
    expose(methodName: string, options?: ExposeOptions): void;
    unexpose(methodName: string): void;
    /** Resolve a request's caller with the configured auth rules (for app-owned routes). */
    resolveAuth(req: IncomingMessage): Promise<ResolvedAuth>;
    readonly registry: MethodRegistry;
    readonly initialized: boolean;
    readonly options: WormholeInitOptions;
    /** Clears state synchronously; resolves once every plugin's `stop()` has finished. */
    _reset(): Promise<void>;
  }

  export const Wormhole: WormholeManager;

  interface GenerateOpenApiSpecOptions {
    name?: string;
    version?: string;
    restPath?: string;
    apiKey?: string | null;
    sessionAuth?: boolean;
    description?: string;
  }

  export function generateOpenApiSpec(
    registry: unknown,
    options?: GenerateOpenApiSpecOptions,
  ): object;

  export function sanitizeToolName(name: string): string;

  /** DDP-connection-like object built from an HTTP request (`clientAddress`, `httpHeaders`, `wormhole: true`). */
  interface WormholeConnection {
    id: null;
    close(): void;
    onClose(): void;
    clientAddress: string | null;
    httpHeaders: Record<string, string | string[] | undefined>;
    wormhole: true;
  }

  /** Build the `this.connection` object used by `invokeMethod` for a request (null without one). */
  export function connectionFromRequest(req: IncomingMessage | null): WormholeConnection | null;

  /** Invoke a Meteor method server-side as `userId` (sets `this.userId` / `this.connection`). */
  export function invokeMethod(
    methodName: string,
    args?: unknown[],
    context?: { userId?: string | null; req?: IncomingMessage | null },
  ): Promise<unknown>;

  /** Map a thrown method error to `{ status, body }` for an HTTP response. */
  export function errorToHttp(
    error: unknown,
    options?: { production?: boolean },
  ): {
    status: number;
    body: { error: string; reason?: string; message: string; details?: unknown };
  };

  export function extractBearer(req: IncomingMessage): string | null;
  export function resolveRequestAuth(
    req: IncomingMessage,
    options?: {
      apiKey?: string | null;
      auth?: AuthOptions | boolean;
      tokenResolver?: (token: string) => Promise<string | null>;
    },
  ): Promise<ResolvedAuth>;
  export function checkAccess(
    auth: ResolvedAuth,
    policy: AuthPolicy,
    options?: { apiKey?: string | null },
  ): { status: number; error: string; message: string } | null;
  export function createAccountsTokenResolver(deps?: {
    Accounts?: unknown;
    users?: unknown;
  }): (token: string) => Promise<string | null>;

  interface NormalizedAuthOptions {
    enabled: boolean;
    resolveUser: ((req: IncomingMessage) => Promise<string | null> | string | null) | null;
  }

  interface RestBridgeOptions {
    restPath?: string;
    name?: string;
    version?: string;
    apiKey?: string | null;
    docs?: boolean;
    /** `true` (default), `false`, or `'auth'` (apiKey or session required) for `/openapi.json`. */
    spec?: boolean | 'auth';
    /** Normalized session-auth options (as produced by `Wormhole.init`). */
    auth?: NormalizedAuthOptions;
    /** `(token) => userId | null`, used when `auth` is enabled without a custom resolver. */
    tokenResolver?: (token: string) => Promise<string | null>;
    onBeforeInvoke?: (info: InvokeHookInfo) => void | Promise<void>;
    /** Hide internal error messages in 500 responses (defaults to `Meteor.isProduction`). */
    production?: boolean;
  }

  export class RestBridge {
    constructor(registry: unknown, options?: RestBridgeOptions);
    start(): void;
    stop(): void;
    destroy(): void;
  }

  /** Host for Wormhole plugins (`Wormhole.use` delegates here). */
  export class PluginHost {
    use(plugin: WormholePlugin): void;
    startAll(api: {
      registry: MethodRegistry;
      options: WormholeInitOptions;
      context: Record<string, unknown>;
      auth?: { resolve(req: IncomingMessage): Promise<ResolvedAuth> };
    }): void;
    /** Clears host state synchronously; resolves once pending starts and all `stop()`s finish. */
    stopAll(): Promise<void>;
    names(): string[];
  }
}
