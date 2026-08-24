import { useState, useEffect, useRef } from 'react';

interface UseWebSocketWithFallbackOptions<T> {
  wsUrl: string;
  fallbackFetchFn: () => Promise<T>;
  fallbackIntervalMs?: number;
  enabled?: boolean;
}

export function useWebSocketWithFallback<T>({
  wsUrl,
  fallbackFetchFn,
  fallbackIntervalMs = 3000,
  enabled = true
}: UseWebSocketWithFallbackOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [isFallbackActive, setIsFallbackActive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const fallbackIntervalRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // Helper to trigger fallback HTTP polling
  const startFallbackPolling = () => {
    setIsFallbackActive(true);
    if (!fallbackIntervalRef.current) {
      fallbackFetchFn()
        .then(result => setData(result))
        .catch(err => setError(err.message || 'Fallback HTTP fetch failed'));

      fallbackIntervalRef.current = setInterval(() => {
        fallbackFetchFn()
          .then(result => setData(result))
          .catch(err => setError(err.message || 'Fallback HTTP fetch failed'));
      }, fallbackIntervalMs);
    }
  };

  // Helper to stop fallback HTTP polling
  const stopFallbackPolling = () => {
    setIsFallbackActive(false);
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  };

  // WebSocket Connection Logic with Auto-Reconnect & Fallback
  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const connectWs = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const fullWsUrl = wsUrl.startsWith('ws://') || wsUrl.startsWith('wss://')
          ? wsUrl
          : `${protocol}//${host}${wsUrl}`;

        const ws = new WebSocket(fullWsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          console.log(`[WS Stream] Connected successfully to ${wsUrl}`);
          setIsWsConnected(true);
          setError(null);
          stopFallbackPolling();
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const parsedData = JSON.parse(event.data);
            setData(parsedData);
          } catch (e) {
            console.error('[WS Parse Error]:', e);
          }
        };

        ws.onerror = (err) => {
          console.warn(`[WS Stream Error] ${wsUrl}:`, err);
        };

        ws.onclose = () => {
          if (!isMounted) return;
          console.warn(`[WS Stream Closed] ${wsUrl}. Activating HTTP Polling Fallback...`);
          setIsWsConnected(false);
          startFallbackPolling();

          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted) {
              connectWs();
            }
          }, 5000);
        };
      } catch (err: any) {
        console.error(`[WS Initialization Failed]:`, err);
        if (isMounted) {
          setIsWsConnected(false);
          startFallbackPolling();
        }
      }
    };

    connectWs();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      stopFallbackPolling();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [wsUrl, enabled]);

  return {
    data,
    isWsConnected,
    isFallbackActive,
    error,
    streamMode: isWsConnected ? ('websocket' as const) : ('fallback' as const)
  };
}
