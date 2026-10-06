import { Dispatcher, EnvHttpProxyAgent } from "undici";
let dispatcher: Dispatcher | undefined;

/** Node 20 does not automatically use the environment's outbound HTTP proxy. */
export function fetchWithProxy(
  url: URL,
  init: RequestInit = {},
): Promise<Response> {
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const useProxy =
    !loopback &&
    Boolean(
      process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY ||
      process.env.https_proxy ||
      process.env.http_proxy,
    );
  if (useProxy) dispatcher ??= new EnvHttpProxyAgent();
  const options = {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(10_000),
    ...(useProxy ? { dispatcher } : {}),
  };
  return fetch(url, options);
}
