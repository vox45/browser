import { ProxyConfig } from '../core/types';
import https from 'https';
import http from 'http';
import { SocksProxyAgent } from 'socks-proxy-agent';

/**
 * Proxy Manager - handles proxy testing and configuration
 * Supports IPv4 and IPv6 addresses
 */

export interface ProxyTestResult {
  success: boolean;
  ip?: string;
  country?: string;
  latency?: number;
  error?: string;
}

/**
 * Check if a string is an IPv6 address
 */
function isIPv6(host: string | undefined | null): boolean {
  if (!host) return false;
  // Remove brackets if present
  const cleanHost = host.replace(/^\[|\]$/g, '');
  // IPv6 contains multiple colons
  return cleanHost.includes(':');
}

/**
 * Format host for URL (wrap IPv6 in brackets)
 */
function formatHost(host: string | undefined | null): string {
  if (!host) return '';
  if (isIPv6(host)) {
    // Remove existing brackets and add new ones
    const cleanHost = host.replace(/^\[|\]$/g, '');
    return `[${cleanHost}]`;
  }
  return host;
}

/**
 * Format proxy URL for Playwright
 */
export function formatProxyUrl(proxy: ProxyConfig): string {
  if (!proxy || !proxy.host || !proxy.port) {
    throw new Error('Invalid proxy configuration: host and port are required');
  }

  const auth = proxy.username && proxy.password
    ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`
    : '';

  const host = formatHost(proxy.host);
  return `${proxy.type || 'http'}://${auth}${host}:${proxy.port}`;
}

/**
 * Parse proxy string to ProxyConfig
 * Supports formats:
 * - host:port
 * - host:port:user:pass
 * - user:pass@host:port
 * - USERNAME:PASSWORD@IP:PORT (same as above)
 * - type://host:port
 * - type://user:pass@host:port
 * - [ipv6]:port
 * - [ipv6]:port:user:pass
 * - user:pass@[ipv6]:port
 * - user:pass@ipv6:port (auto-detects IPv6 by colon count)
 * - type://[ipv6]:port
 * - type://user:pass@[ipv6]:port
 */
export function parseProxyString(proxyString: string): ProxyConfig | null {
  try {
    if (!proxyString || typeof proxyString !== 'string') {
      return null;
    }

    proxyString = proxyString.trim();
    if (!proxyString) {
      return null;
    }

    let type: ProxyConfig['type'] = 'http';
    let host: string = '';
    let port: number = 0;
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
      const atIndex = proxyString.lastIndexOf('@');
      const auth = proxyString.slice(0, atIndex);
      const hostPort = proxyString.slice(atIndex + 1);

      // Parse auth (user:pass)
      const colonIndex = auth.indexOf(':');
      if (colonIndex !== -1) {
        username = auth.slice(0, colonIndex);
        password = auth.slice(colonIndex + 1);
      } else {
        username = auth;
      }

      proxyString = hostPort;
    }

    // Check if it's an IPv6 address (wrapped in brackets)
    if (proxyString.startsWith('[')) {
      // IPv6 format: [ipv6]:port or [ipv6]:port:user:pass
      const closeBracket = proxyString.indexOf(']');
      if (closeBracket === -1) {
        return null;
      }

      host = proxyString.slice(1, closeBracket); // Extract IPv6 without brackets
      const remainder = proxyString.slice(closeBracket + 1);

      if (!remainder.startsWith(':')) {
        return null;
      }

      const parts = remainder.slice(1).split(':');
      if (parts.length === 1) {
        port = parseInt(parts[0], 10);
      } else if (parts.length === 3) {
        port = parseInt(parts[0], 10);
        username = username || parts[1];
        password = password || parts[2];
      } else {
        return null;
      }
    } else {
      // IPv4 or hostname format
      // Check if it looks like an IPv6 without brackets (multiple colons)
      const colonCount = (proxyString.match(/:/g) || []).length;

      if (colonCount > 3) {
        // Likely IPv6 without brackets - try to parse
        // Find the last colon that separates port
        const lastColonIndex = proxyString.lastIndexOf(':');
        const potentialPort = proxyString.slice(lastColonIndex + 1);

        if (/^\d+$/.test(potentialPort)) {
          host = proxyString.slice(0, lastColonIndex);
          port = parseInt(potentialPort, 10);
        } else {
          return null;
        }
      } else {
        // Standard format: host:port or host:port:user:pass
        const parts = proxyString.split(':');
        if (parts.length === 2) {
          host = parts[0];
          port = parseInt(parts[1], 10);
        } else if (parts.length === 4) {
          host = parts[0];
          port = parseInt(parts[1], 10);
          username = username || parts[2];
          password = password || parts[3];
        } else {
          return null;
        }
      }
    }

    if (!host || isNaN(port) || port <= 0 || port > 65535) {
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

        req.on('error', (err: NodeJS.ErrnoException) => {
          let errorMsg = err.message;
          // Provide more helpful error messages
          if (err.code === 'ENETUNREACH') {
            errorMsg = 'Network unreachable - IPv6 may not be supported on your system';
          } else if (err.code === 'ECONNREFUSED') {
            errorMsg = 'Connection refused - proxy server may be down';
          } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
            errorMsg = 'Connection timed out';
          } else if (err.code === 'ENOTFOUND') {
            errorMsg = 'Host not found - check proxy address';
          }
          resolve({
            success: false,
            error: errorMsg,
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

      req.on('error', (err: NodeJS.ErrnoException) => {
        let errorMsg = err.message;
        // Provide more helpful error messages
        if (err.code === 'ENETUNREACH') {
          errorMsg = 'Network unreachable - IPv6 may not be supported on your system';
        } else if (err.code === 'ECONNREFUSED') {
          errorMsg = 'Connection refused - proxy server may be down';
        } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
          errorMsg = 'Connection timed out';
        } else if (err.code === 'ENOTFOUND') {
          errorMsg = 'Host not found - check proxy address';
        }
        resolve({
          success: false,
          error: errorMsg,
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
      let errorMsg = err.message;
      if (err.code === 'ENETUNREACH') {
        errorMsg = 'Network unreachable - IPv6 may not be supported on your system';
      }
      resolve({
        success: false,
        error: errorMsg,
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
} | null {
  if (!proxy || !proxy.host || !proxy.port) {
    console.error('Invalid proxy configuration:', proxy);
    return null;
  }

  const proxyType = proxy.type === 'socks4' || proxy.type === 'socks5' ? 'socks5' : (proxy.type || 'http');
  const host = formatHost(proxy.host);
  const server = `${proxyType}://${host}:${proxy.port}`;

  const config: { server: string; username?: string; password?: string } = { server };

  if (proxy.username) {
    config.username = proxy.username;
  }
  if (proxy.password) {
    config.password = proxy.password;
  }

  return config;
}
