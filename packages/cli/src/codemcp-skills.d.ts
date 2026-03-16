declare module "@codemcp/skills/api" {
  export interface AddOptions {
    global?: boolean;
    agent?: string[];
    yes?: boolean;
    skill?: string[];
    list?: boolean;
    all?: boolean;
    fullDepth?: boolean;
    copy?: boolean;
  }

  export function runAdd(args: string[], options?: AddOptions): Promise<void>;

  export function runInstallFromLock(args: string[]): Promise<void>;

  export function parseAddOptions(args: string[]): {
    source: string[];
    options: AddOptions;
  };
}
