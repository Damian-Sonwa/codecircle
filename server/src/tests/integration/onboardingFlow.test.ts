import request from 'supertest';
import {createApp} from '@/app';

const app = createApp();

describe('onboarding flow', () => {
  it('completes onboarding and joins welcome group', async () => {
    const signupResponse = await request(app)
      .post('/api/auth/signup')
      .send({username: 'learner', email: 'learner@example.com', password: 'Password123!'});

    const token = signupResponse.body.tokens.accessToken;

    const onboarding = await request(app)
      .post('/api/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({
        skills: ['Fullstack'],
        skillLevel: 'Beginner',
        answers: {goal: 'Pair program with peers'}
      })
      .expect(200);

    expect(onboarding.body.hasOnboarded).toBe(true);
    expect(onboarding.body.skills).toContain('Fullstack');
  });
});

