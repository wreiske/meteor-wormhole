declare module 'meteor/wreiske:meteor-wormhole' {
  import type { IncomingMessage, ServerResponse } from 'http';

  interface RestOptions {
    enabled?: boolean;
    path?: string;
    docs?: boolean;
    apiKey?: string | null;
  }

  interface MethodRegistryEntry {
    description: string;
    inputSchema: object | null;
    outputSchema: object | null;
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
    rest?: RestOptions | boolean;
    context?: Record<string, unknown>;
  }

  interface ExposeOptions {
    description?: string;
    inputSchema?: object;
    outputSchema?: object;
  }

  interface WormholeManager {
    init(options?: WormholeInitOptions): void;
    use<TContext = Record<string, unknown>>(plugin: WormholePlugin<TContext>): void;
    expose(methodName: string, options?: ExposeOptions): void;
    unexpose(methodName: string): void;
    readonly registry: MethodRegistry;
    readonly initialized: boolean;
    readonly options: WormholeInitOptions;
    _reset(): void;
  }

  export const Wormhole: WormholeManager;

  interface GenerateOpenApiSpecOptions {
    name?: string;
    version?: string;
    restPath?: string;
    apiKey?: string | null;
    description?: string;
  }

  export function generateOpenApiSpec(
    registry: unknown,
    options?: GenerateOpenApiSpecOptions,
  ): object;

  export function sanitizeToolName(name: string): string;

  export class RestBridge {
    constructor(
      registry: unknown,
      options?: {
        restPath?: string;
        name?: string;
        version?: string;
        apiKey?: string | null;
        docs?: boolean;
      },
    );
    start(): void;
    destroy(): void;
  }
}
