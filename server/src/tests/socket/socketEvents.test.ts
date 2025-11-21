import {createServer} from 'http';
import {Server} from 'socket.io';
import Client from 'socket.io-client';
import {createApp} from '@/app';
import {registerSocketEvents} from '@/socket/register';
import {MessageModel} from '@/models/Message';
import {ConversationModel} from '@/models/Conversation';
import {UserModel} from '@/models/User';
import {createAccessToken} from '@/utils/token';

describe('socket events', () => {
  let io: Server, port: number;

  let httpServer: ReturnType<typeof createServer>;

  beforeAll((done) => {
    const app = createApp();
    httpServer = createServer(app);
    io = new Server(httpServer);
    registerSocketEvents(io);
    httpServer.listen(() => {
      const addr = httpServer.address();
      port = typeof addr === 'string' ? 0 : addr?.port ?? 0;
      done();
    });
  });

  afterAll((done) => {
    io.close();
    httpServer.close(done);
  });

  it('emits message:new when a message is sent', async () => {
    const user = await UserModel.create({username: 'socket-user', email: 'socket@example.com', passwordHash: 'hash'});
    const conversation = await ConversationModel.create({type: 'dm', participants: [user._id]});
    const token = createAccessToken(user.id, user.username);

    const client = Client(`http://localhost:${port}`, {auth: {token}});

    const newMessage = new Promise((resolve) => {
      client.on('message:new', (payload) => {
        resolve(payload);
      });
    });

    await new Promise((resolve) => client.on('connect', resolve));
    client.emit('conversation:join', {conversationId: conversation.id});
    client.emit('message:send', {conversationId: conversation.id, content: 'Socket hello'});

    const payload: any = await newMessage;
    expect(payload.content).toBe('Socket hello');
    const stored = await MessageModel.findById(payload._id);
    expect(stored).not.toBeNull();
    client.disconnect();
  });
});

