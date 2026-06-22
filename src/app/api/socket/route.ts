import { NextRequest, NextResponse } from 'next/server';
import { getSocketServer } from '@/lib/socket';

export async function GET(request: NextRequest) {
  const io = getSocketServer();
  
  if (!io) {
    return NextResponse.json(
      { success: false, error: 'Socket server not initialized' },
      { status: 503 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Socket.io server is running',
    connectedClients: io.engine.clientsCount,
  });
}