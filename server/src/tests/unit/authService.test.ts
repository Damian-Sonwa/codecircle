import {signup, login} from '@/services/authService';
import {UserModel} from '@/models/User';

describe('authService', () => {
  it('signs up a new user', async () => {
    const {user, tokens} = await signup('alice', 'alice@example.com', 'Password123!');
    expect(user.username).toBe('alice');
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    const stored = await UserModel.findById(user._id);
    expect(stored).not.toBeNull();
  });

  it('logs in an existing user', async () => {
    await signup('bob', 'bob@example.com', 'Password123!');
    const {user} = await login('bob@example.com', 'Password123!');
    expect(user.status).toBe('online');
  });
});


