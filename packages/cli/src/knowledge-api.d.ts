declare module "@codemcp/knowledge/packages/cli/dist/exports.js" {
  interface CreateDocsetParams {
    id: string;
    name: string;
    description?: string;
    preset: "git-repo" | "local-folder" | "archive";
    url?: string;
    branch?: string;
    paths?: string[];
    path?: string;
  }

  interface CreateDocsetOptions {
    cwd?: string;
  }

  interface CreateDocsetResult {
    docset: unknown;
    configPath: string;
    configCreated: boolean;
  }

  interface InitDocsetParams {
    docsetId: string;
    force?: boolean;
    discoverPaths?: boolean;
    cwd?: string;
    onSourceProgress?: (progress: unknown) => void;
  }

  interface InitDocsetResult {
    alreadyInitialized: boolean;
    discoveredPaths?: string[];
  }

  export function createDocset(
    params: CreateDocsetParams,
    options?: CreateDocsetOptions
  ): Promise<CreateDocsetResult>;

  export function initDocset(
    params: InitDocsetParams
  ): Promise<InitDocsetResult>;

  export function refreshDocsets(params?: {
    docsetId?: string;
    force?: boolean;
    cwd?: string;
  }): Promise<unknown>;

  export function getStatus(params?: { cwd?: string }): Promise<unknown>;
}
