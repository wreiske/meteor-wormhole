declare module 'meteor/wreiske:meteor-wormhole' {
  interface RestOptions {
    enabled?: boolean;
    path?: string;
    docs?: boolean;
    apiKey?: string | null;
  }

  interface WormholeInitOptions {
    mode?: 'all' | 'opt-in';
    path?: string;
    name?: string;
    version?: string;
    apiKey?: string | null;
    exclude?: Array<string | RegExp>;
    rest?: RestOptions | boolean;
  }

  interface ExposeOptions {
    description?: string;
    inputSchema?: object;
    outputSchema?: object;
  }

  interface WormholeManager {
    init(options?: WormholeInitOptions): void;
    expose(methodName: string, options?: ExposeOptions): void;
    unexpose(methodName: string): void;
    readonly registry: unknown;
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
