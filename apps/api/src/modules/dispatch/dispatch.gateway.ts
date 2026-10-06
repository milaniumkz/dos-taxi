import { UserRole } from "@dos/shared-types";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

import { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

import { IncomingOrderPayload } from "./dispatch-realtime.service";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class DispatchGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    const payload = await this.verifyClient(client);
    if (!payload || payload.role !== UserRole.EXECUTOR) {
      client.disconnect(true);
      return;
    }

    client.data.user = payload;
    await client.join(this.executorRoom(payload.sub));
  }

  @SubscribeMessage("executor:subscribe")
  async subscribeExecutor(
    @ConnectedSocket() client: Socket,
  ): Promise<{ ok: boolean }> {
    const user = client.data.user as JwtPayload | undefined;
    if (!user || user.role !== UserRole.EXECUTOR) {
      return { ok: false };
    }

    await client.join(this.executorRoom(user.sub));
    return { ok: true };
  }

  emitIncomingOrder(payload: IncomingOrderPayload): void {
    this.server
      .to(this.executorRoom(payload.executorUserId))
      .emit("executor:incoming_order", payload.offer);
  }

  private async verifyClient(client: Socket): Promise<JwtPayload | null> {
    const token = this.extractToken(client);
    if (!token) {
      return null;
    }

    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === "string" && authToken.trim().length > 0) {
      return authToken.trim();
    }

    const queryToken = client.handshake.query.token;
    if (typeof queryToken === "string" && queryToken.trim().length > 0) {
      return queryToken.trim();
    }

    const authorization = client.handshake.headers.authorization;
    if (typeof authorization === "string") {
      const [scheme, token] = authorization.split(" ");
      if (scheme?.toLowerCase() === "bearer" && token?.trim()) {
        return token.trim();
      }
    }

    return null;
  }

  private executorRoom(userId: string): string {
    return `executor:${userId}`;
  }
}
