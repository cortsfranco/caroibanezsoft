import { useEffect, useState } from "react";
import { wsClient, type WebSocketMessage } from "@/lib/websocket";

export function useWebSocket(
  callback?: (message: WebSocketMessage) => void
) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check connection status
    const checkConnection = () => {
      setIsConnected(true);
    };

    // Add listener for messages
    const removeListener = callback
      ? wsClient.addListener(callback)
      : () => {};

    // Initial connection check
    checkConnection();

    // Cleanup
    return () => {
      removeListener();
    };
  }, [callback]);

  return {
    isConnected,
    send: wsClient.send.bind(wsClient),
  };
}
