import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

export interface WebSocketMessage {
  type: "update" | "create" | "delete";
  entity: "patient" | "group" | "membership" | "measurement" | "calculation" | "diet" | "report";
  data: any;
  timestamp: number;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", (ws: WebSocket) => {
      console.log("New WebSocket client connected");
      this.clients.add(ws);

      ws.on("message", (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          console.log("Received message from client:", data);
          // Handle any client-to-server messages here
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });

      ws.on("close", () => {
        console.log("WebSocket client disconnected");
        this.clients.delete(ws);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        this.clients.delete(ws);
      });

      // Send initial connection success message
      ws.send(JSON.stringify({ type: "connected", timestamp: Date.now() }));
    });

    console.log("WebSocket server initialized");
  }

  broadcast(message: WebSocketMessage) {
    if (!this.wss) {
      console.warn("WebSocket server not initialized");
      return;
    }

    const payload = JSON.stringify(message);
    let successCount = 0;
    let failCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
          successCount++;
        } catch (error) {
          console.error("Error sending message to client:", error);
          failCount++;
        }
      }
    });

    console.log(`Broadcast message to ${successCount} clients (${failCount} failed)`);
  }

  // Convenience methods for common operations
  notifyPatientUpdate(patientId: string, data: any) {
    this.broadcast({
      type: "update",
      entity: "patient",
      data: { id: patientId, ...data },
      timestamp: Date.now(),
    });
  }

  notifyPatientCreated(data: any) {
    this.broadcast({
      type: "create",
      entity: "patient",
      data,
      timestamp: Date.now(),
    });
  }

  notifyPatientDeleted(patientId: string) {
    this.broadcast({
      type: "delete",
      entity: "patient",
      data: { id: patientId },
      timestamp: Date.now(),
    });
  }

  notifyGroupUpdate(groupId: string, data: any) {
    this.broadcast({
      type: "update",
      entity: "group",
      data: { id: groupId, ...data },
      timestamp: Date.now(),
    });
  }

  notifyGroupCreated(data: any) {
    this.broadcast({
      type: "create",
      entity: "group",
      data,
      timestamp: Date.now(),
    });
  }

  notifyGroupDeleted(groupId: string) {
    this.broadcast({
      type: "delete",
      entity: "group",
      data: { id: groupId },
      timestamp: Date.now(),
    });
  }

  notifyMembershipUpdate(data: any) {
    this.broadcast({
      type: "update",
      entity: "membership",
      data,
      timestamp: Date.now(),
    });
  }

  notifyMeasurementUpdate(measurementId: string, data: any) {
    this.broadcast({
      type: "update",
      entity: "measurement",
      data: { id: measurementId, ...data },
      timestamp: Date.now(),
    });
  }

  notifyMeasurementCreated(data: any) {
    this.broadcast({
      type: "create",
      entity: "measurement",
      data,
      timestamp: Date.now(),
    });
  }

  notifyMeasurementDeleted(measurementId: string) {
    this.broadcast({
      type: "delete",
      entity: "measurement",
      data: { id: measurementId },
      timestamp: Date.now(),
    });
  }

  notifyCalculationUpdate(data: any) {
    this.broadcast({
      type: "update",
      entity: "calculation",
      data,
      timestamp: Date.now(),
    });
  }

  notifyDietUpdate(dietId: string, data: any) {
    this.broadcast({
      type: "update",
      entity: "diet",
      data: { id: dietId, ...data },
      timestamp: Date.now(),
    });
  }

  notifyDietCreated(data: any) {
    this.broadcast({
      type: "create",
      entity: "diet",
      data,
      timestamp: Date.now(),
    });
  }

  notifyDietDeleted(dietId: string) {
    this.broadcast({
      type: "delete",
      entity: "diet",
      data: { id: dietId },
      timestamp: Date.now(),
    });
  }

  notifyReportUpdate(reportId: string, data: any) {
    this.broadcast({
      type: "update",
      entity: "report",
      data: { id: reportId, ...data },
      timestamp: Date.now(),
    });
  }

  notifyReportCreated(data: any) {
    this.broadcast({
      type: "create",
      entity: "report",
      data,
      timestamp: Date.now(),
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();
