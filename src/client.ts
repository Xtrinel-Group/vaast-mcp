import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export interface SessionInfo {
  port: number;
  token: string;
  protocol_version?: string;
}

export type SessionLoader = () => Promise<SessionInfo>;

export const DEFAULT_TIMEOUT_MS = 30_000;

export const SESSION_PATH = join(homedir(), '.vaast', 'mcp.json');

export async function loadSessionFile(path: string = SESSION_PATH): Promise<SessionInfo> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await fs.readFile(path, 'utf-8'));
  } catch {
    throw new Error(
      `Failed to read VAAST MCP session file at ${path}. ` +
      `Make sure VAAST is running and the MCP server is started.`
    );
  }
  return validateSession(parsed, path);
}

export function validateSession(value: unknown, path = 'session file'): SessionInfo {
  const session = value as Partial<SessionInfo> | null;
  const port = session?.port;
  const token = session?.token;
  if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port in ${path}. Restart the MCP server in VAAST.`);
  }
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error(`Missing token in ${path}. Restart the MCP server in VAAST.`);
  }
  return { port, token, protocol_version: session?.protocol_version };
}

// Thrown when the cached session is likely out of date (VAAST restarted,
// so the port or token changed).
class StaleSessionError extends Error {}

export class VaastClient {
  private session?: SessionInfo;
  private nextId = 1;

  constructor(
    private readonly loadSession: SessionLoader = () => loadSessionFile(),
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {}

  async request(method: string, params?: unknown): Promise<any> {
    try {
      return await this.send(await this.getSession(), method, params);
    } catch (error) {
      if (!(error instanceof StaleSessionError)) throw error;
      // Re-read the session file once and retry.
      this.session = undefined;
      try {
        return await this.send(await this.getSession(), method, params);
      } catch (retryError) {
        if (retryError instanceof StaleSessionError) {
          throw new Error(
            'Could not reach VAAST. Make sure VAAST is running and the MCP server is started.'
          );
        }
        throw retryError;
      }
    }
  }

  private async getSession(): Promise<SessionInfo> {
    if (!this.session) {
      this.session = await this.loadSession();
    }
    return this.session;
  }

  private async send(session: SessionInfo, method: string, params?: unknown): Promise<any> {
    const url = `http://127.0.0.1:${session.port}/message`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`,
          'Host': `127.0.0.1:${session.port}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: this.nextId++,
          method,
          params: params ?? {},
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error(`VAAST did not respond within ${this.timeoutMs / 1000}s`);
      }
      // Connection refused usually means VAAST restarted on a new port.
      throw new StaleSessionError(String(error));
    }

    if (response.status === 401) {
      throw new StaleSessionError('Unauthorized');
    }
    if (!response.ok) {
      const statusText = response.statusText || 'Request failed';
      throw new Error(`VAAST MCP server error: HTTP ${response.status} ${statusText}`);
    }

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message ?? JSON.stringify(result.error));
    }
    return result.result;
  }
}
