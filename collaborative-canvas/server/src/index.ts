import { WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

interface ClientMeta {
  ws: WebSocket;
  username: string;
  room: string;
}

const rooms = new Map<string, { clients: Map<WebSocket, ClientMeta>; history: any[] }>();

wss.on('connection', (ws: WebSocket) => {
  let currentRoom = 'default-room';
  let currentUsername = 'Anonymous';

  ws.on('message', (data: string) => {
    try {
      const message = JSON.parse(data);

      if (message.type === 'join-room') {
        currentRoom = message.room || 'default-room';
        currentUsername = message.username || 'Anonymous';

        if (!rooms.has(currentRoom)) {
          rooms.set(currentRoom, { clients: new Map(), history: [] });
        }
        
        const room = rooms.get(currentRoom)!;
        room.clients.set(ws, { ws, username: currentUsername, room: currentRoom });

        // Send initialization history and active member list
        ws.send(JSON.stringify({ type: 'init', history: room.history }));
        broadcastRoomUsers(currentRoom);
        return;
      }

      const room = rooms.get(currentRoom);
      if (!room) return;

      if (message.type === 'draw') {
        room.history.push(message);
      } else if (message.type === 'clear') {
        room.history = [];
      }

      // Broadcast payload to all peers in the room
      room.clients.forEach((meta) => {
        if (meta.ws.readyState === WebSocket.OPEN) {
          meta.ws.send(JSON.stringify(message));
        }
      });
    } catch (err) {
      console.error('Error handling message:', err);
    }
  });

  ws.on('close', () => {
    const room = rooms.get(currentRoom);
    if (room) {
      room.clients.delete(ws);
      broadcastRoomUsers(currentRoom);
    }
  });
});

function broadcastRoomUsers(roomName: string) {
  const room = rooms.get(roomName);
  if (!room) return;

  const users = Array.from(room.clients.values()).map(c => c.username);
  const userPayload = JSON.stringify({ type: 'room-users', users });

  room.clients.forEach((meta) => {
    if (meta.ws.readyState === WebSocket.OPEN) {
      meta.ws.send(userPayload);
    }
  });
}

console.log('🚀 Advanced WebSocket server running on ws://localhost:8080');