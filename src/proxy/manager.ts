import { ProxyConfig } from '../core/types';
import https from 'https';
import http from 'http';
import { SocksProxyAgent } from 'socks-proxy-agent';

/**
 * Proxy Manager - handles proxy testing and configuration
 */

export interface ProxyTestResult {
  success: boolean;
  ip?: string;
  country?: string;
  latency?: number;
  error?: string;
}

/**
 * Format proxy URL for Playwright
 */
export function formatProxyUrl(proxy: ProxyConfig): string {
  const auth = proxy.username && proxy.password
    ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`
    : '';

  return `${proxy.type}://${auth}${proxy.host}:${proxy.port}`;
}

/**
 * Parse proxy string to ProxyConfig
 * Supports formats:
 * - host:port
 * - host:port:user:pass
 * - user:pass@host:port
 * - type://host:port
 * - type://user:pass@host:port
 */
export function parseProxyString(proxyString: string): ProxyConfig | null {
  try {
    let type: ProxyConfig['type'] = 'http';
    let host: string;
    let port: number;
    let username: string | undefined;
    let password: string | undefined;

    // Check for protocol
    const protocolMatch = proxyString.match(/^(https?|socks[45]):\/\//i);
    if (protocolMatch) {
      type = protocolMatch[1].toLowerCase() as ProxyConfig['type'];
      proxyString = proxyString.slice(protocolMatch[0].length);
    }

    // Check for user:pass@host:port format
    if (proxyString.includes('@')) {
      const [auth, hostPort] = proxyString.split('@');
      const [user, pass] = auth.split(':');
      username = user;
      password = pass;
      proxyString = hostPort;
    }

    // Parse host:port or host:port:user:pass
    const parts = proxyString.split(':');
    if (parts.length === 2) {
      host = parts[0];
      port = parseInt(parts[1], 10);
    } else if (parts.length === 4) {
      host = parts[0];
      port = parseInt(parts[1], 10);
      username = parts[2];
      password = parts[3];
    } else {
      return null;
    }

    if (!host || isNaN(port)) {
      return null;
    }

    return { type, host, port, username, password };
  } catch {
    return null;
  }
}

/**
 * Test proxy connection
 */
export async function testProxy(proxy: ProxyConfig): Promise<ProxyTestResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const timeout = 10000; // 10 seconds

    try {
      const testUrl = 'https://api.ipify.org?format=json';

      let agent: any;

      if (proxy.type === 'socks4' || proxy.type === 'socks5') {
        const proxyUrl = formatProxyUrl(proxy);
        agent = new SocksProxyAgent(proxyUrl);
      } else {
        // For HTTP/HTTPS proxies, we'll use a simple test
        const options: http.RequestOptions = {
          hostname: proxy.host,
          port: proxy.port,
          method: 'CONNECT',
          path: 'api.ipify.org:443',
          timeout,
        };

        if (proxy.username && proxy.password) {
          options.headers = {
            'Proxy-Authorization': 'Basic ' + Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64'),
          };
        }

        const req = http.request(options, (res) => {
          if (res.statusCode === 200) {
            const latency = Date.now() - startTime;
            resolve({
              success: true,
              latency,
            });
          } else {
            resolve({
              success: false,
              error: `Proxy returned status ${res.statusCode}`,
            });
          }
        });

        req.on('error', (err) => {
          resolve({
            success: false,
            error: err.message,
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            success: false,
            error: 'Connection timeout',
          });
        });

        req.end();
        return;
      }

      // For SOCKS proxies
      const req = https.get(testUrl, { agent, timeout }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const latency = Date.now() - startTime;
            resolve({
              success: true,
              ip: json.ip,
              latency,
            });
          } catch {
            resolve({
              success: true,
              latency: Date.now() - startTime,
            });
          }
        });
      });

      req.on('error', (err) => {
        resolve({
          success: false,
          error: err.message,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: 'Connection timeout',
        });
      });
    } catch (err: any) {
      resolve({
        success: false,
        error: err.message,
      });
    }
  });
}

/**
 * Get Playwright proxy configuration
 */
export function getPlaywrightProxy(proxy: ProxyConfig): {
  server: string;
  username?: string;
  password?: string;
} {
  const server = `${proxy.type === 'socks4' || proxy.type === 'socks5' ? 'socks5' : proxy.type}://${proxy.host}:${proxy.port}`;

  const config: { server: string; username?: string; password?: string } = { server };

  if (proxy.username) {
    config.username = proxy.username;
  }
  if (proxy.password) {
    config.password = proxy.password;
  }

  return config;
}
