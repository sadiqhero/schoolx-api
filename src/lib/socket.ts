import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken, JWTPayload } from '@/lib/auth';

let io: SocketIOServer | null = null;

export function initializeSocket(httpServer: HttpServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/api/socket',
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (typeof token === 'string') {
      const payload = verifyToken(token);
      if (payload) {
        (socket as Socket & { user: JWTPayload }).user = payload;
        return next();
      }
    }
    
    next(new Error('Authentication required'));
  });

  io.on('connection', (socket: Socket & { user: JWTPayload }) => {
    console.log(`Client connected: ${socket.user.email} (${socket.id})`);

    socket.join(`user:${socket.user.userId}`);
    socket.join(`role:${socket.user.role}`);

    socket.on('subscribe:class', (className: string) => {
      socket.join(`class:${className}`);
      console.log(`${socket.user.email} subscribed to class: ${className}`);
    });

    socket.on('unsubscribe:class', (className: string) => {
      socket.leave(`class:${className}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.user.email} - ${reason}`);
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

export function emitToClass(className: string, event: string, data: unknown) {
  if (io) {
    io.to(`class:${className}`).emit(event, data);
  }
}

export function emitToRole(role: string, event: string, data: unknown) {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
}

export function emitToUser(userId: string, event: string, data: unknown) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function broadcast(event: string, data: unknown) {
  if (io) {
    io.emit(event, data);
  }
}