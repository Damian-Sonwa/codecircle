import Redis from 'ioredis';
import {env} from '@/config/env';

const redis = env.redisUrl ? new Redis(env.redisUrl) : null;
const PREFIX = 'presence:user:';

export const setPresence = async (userId: string, status: string) => {
  if (!redis) return;
  await redis.set(`${PREFIX}${userId}`, status, 'EX', 60);
};

export const getPresence = async (userId: string) => {
  if (!redis) return 'offline';
  return (await redis.get(`${PREFIX}${userId}`)) ?? 'offline';
};

export const presenceClient = redis;


