import fs from 'fs';
import path from 'path';

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'GlassChat API',
    version: '1.0.0',
    description: 'REST & WebSocket API for the realtime chat application'
  },
  servers: [{url: 'http://localhost:4000'}],
  paths: {
    '/api/auth/signup': {
      post: {
        summary: 'Create user account',
        requestBody: {required: true},
        responses: {'201': {description: 'Created'}}
      }
    },
    '/api/auth/login': {
      post: {
        summary: 'Login user',
        requestBody: {required: true},
        responses: {'200': {description: 'OK'}}
      }
    },
    '/api/conversations': {
      get: {summary: 'List conversations', responses: {'200': {description: 'OK'}}},
      post: {summary: 'Create conversation', responses: {'201': {description: 'Created'}}}
    },
    '/api/conversations/{conversationId}/messages': {
      get: {summary: 'List messages', responses: {'200': {description: 'OK'}}},
      post: {summary: 'Send message', responses: {'201': {description: 'Created'}}}
    },
    '/api/onboarding': {
      post: {summary: 'Complete onboarding', responses: {'200': {description: 'Updated profile'}}}
    },
    '/api/friends/invite': {
      post: {summary: 'Create invite link', responses: {'201': {description: 'Invite created'}}}
    },
    '/api/friends/invite/{code}/accept': {
      post: {summary: 'Accept invite via code', responses: {'200': {description: 'Friendship created'}}}
    },
    '/api/classrooms': {
      get: {summary: 'List classrooms', responses: {'200': {description: 'OK'}}},
      post: {summary: 'Create classroom', responses: {'201': {description: 'Classroom created'}}}
    },
    '/api/classrooms/{classroomId}/sessions': {
      post: {summary: 'Add class session', responses: {'201': {description: 'Session added'}}}
    },
    '/api/knowledge': {
      get: {summary: 'List knowledge hub posts', responses: {'200': {description: 'OK'}}},
      post: {summary: 'Create knowledge item', responses: {'201': {description: 'Post created'}}}
    },
    '/api/admin/analytics': {
      get: {summary: 'Get admin analytics', responses: {'200': {description: 'Analytics data'}}}
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

const output = path.resolve(process.cwd(), 'docs', 'openapi.json');
fs.writeFileSync(output, JSON.stringify(openapi, null, 2));
console.log(`OpenAPI spec written to ${output}`);


