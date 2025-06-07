import request from 'supertest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io } from 'socket.io-client';
import express from 'express';
import cors from 'cors';

describe('Server', () => {
  let app: express.Application;
  let httpServer: any;
  let ioServer: Server;
  let clientSocket: any;

  beforeAll((done) => {
    app = express();
    app.use(cors());
    app.use(express.json());
    
    httpServer = createServer(app);
    ioServer = new Server(httpServer, {
      cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    const messages: Array<{ id: string; text: string; sender: string; timestamp: number }> = [];

    app.get('/api/messages', (req, res) => {
      res.json(messages);
    });

    ioServer.on('connection', (socket) => {
      socket.emit('messages', messages);

      socket.on('message', (message: { text: string; sender: string }) => {
        const newMessage = {
          id: Date.now().toString(),
          text: message.text,
          sender: message.sender,
          timestamp: Date.now()
        };
        
        messages.push(newMessage);
        ioServer.emit('message', newMessage);
      });
    });

    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      clientSocket = io(`http://localhost:${port}`);
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    ioServer.close();
    clientSocket.close();
    httpServer.close();
  });

  it('should return empty messages array on GET /api/messages', async () => {
    const response = await request(app).get('/api/messages');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  it('should handle new messages via socket.io', (done) => {
    const testMessage = {
      text: 'Hello, World!',
      sender: 'TestUser'
    };

    clientSocket.on('message', (message: any) => {
      expect(message.text).toBe(testMessage.text);
      expect(message.sender).toBe(testMessage.sender);
      expect(message.id).toBeDefined();
      expect(message.timestamp).toBeDefined();
      done();
    });

    clientSocket.emit('message', testMessage);
  });
}); 