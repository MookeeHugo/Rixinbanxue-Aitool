declare module '@anthropic-ai/claude-code' {
  export interface ClaudeCodeQueryParams {
    prompt: string;
    abortController?: AbortController;
    options?: Record<string, unknown>;
  }

  export function query(
    params: ClaudeCodeQueryParams
  ): AsyncGenerator<Record<string, unknown>>;

  export const version: string | undefined;

  const module: {
    query: typeof query;
    version?: typeof version;
  };

  export default module;
}
