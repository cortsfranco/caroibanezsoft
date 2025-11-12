import { queryClient } from "./queryClient";

export interface WebSocketMessage {
  type: "update" | "create" | "delete" | "connected";
  entity?: "patient" | "group" | "membership" | "measurement" | "calculation" | "diet" | "report";
  data?: any;
  timestamp?: number;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private listeners: Set<(message: WebSocketMessage) => void> = new Set();

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("[WS] Already connected");
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log("[WS] Connecting to", wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("[WS] Connected");
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log("[WS] Message received:", message);

          // Handle connected message
          if (message.type === "connected") {
            console.log("[WS] Connection confirmed");
            return;
          }

          // Notify all listeners
          this.listeners.forEach((listener) => listener(message));

          // Automatically invalidate queries based on entity changes
          this.handleQueryInvalidation(message);
        } catch (error) {
          console.error("[WS] Error parsing message:", error);
        }
      };

      this.ws.onclose = () => {
        console.log("[WS] Connection closed");
        this.ws = null;
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("[WS] Error:", error);
      };
    } catch (error) {
      console.error("[WS] Failed to create WebSocket:", error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[WS] Max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleQueryInvalidation(message: WebSocketMessage) {
    if (!message.entity) return;

    const { entity, type } = message;

    // Invalidate queries based on entity and type
    switch (entity) {
      case "patient":
        queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
        break;
      case "group":
        queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
        queryClient.invalidateQueries({ queryKey: ["/api/memberships"] });
        queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
        break;
      case "membership":
        queryClient.invalidateQueries({ queryKey: ["/api/memberships"] });
        queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
        break;
      case "measurement":
        queryClient.invalidateQueries({ queryKey: ["/api/measurements"] });
        queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
        break;
      case "calculation":
        queryClient.invalidateQueries({ queryKey: ["/api/calculations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/measurements"] });
        break;
      case "diet":
        queryClient.invalidateQueries({ queryKey: ["/api/diets"] });
        break;
      case "report":
        queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
        break;
    }

    console.log(`[WS] Invalidated queries for ${entity} (${type})`);
  }

  addListener(listener: (message: WebSocketMessage) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("[WS] Cannot send message, not connected");
    }
  }
}

export const wsClient = new WebSocketClient();

// Auto-connect when module loads
if (typeof window !== "undefined") {
  wsClient.connect();
}
