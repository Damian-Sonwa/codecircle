import request from 'supertest';
import {createApp} from '@/app';
import {UserModel} from '@/models/User';
import {ConversationModel} from '@/models/Conversation';
import {createAccessToken} from '@/utils/token';

const app = createApp();

describe('message flow', () => {
  it('allows sending and listing messages', async () => {
    const user = await UserModel.create({
      username: 'charlie',
      email: 'charlie@example.com',
      passwordHash: 'hash'
    });
    const conversation = await ConversationModel.create({type: 'dm', participants: [user._id]});
    const token = createAccessToken(user.id, user.username);

    await request(app)
      .post(`/api/conversations/${conversation.id}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({conversationId: conversation.id, content: 'Hello world'})
      .expect(201);

    const response = await request(app)
      .get(`/api/conversations/${conversation.id}/messages?limit=10`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data).toBeDefined();
  });
});

