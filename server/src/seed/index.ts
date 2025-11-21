import mongoose, {Types} from 'mongoose';
import bcrypt from 'bcrypt';
import {connectDatabase} from '@/config/database';
import {UserModel} from '@/models/User';
import {ConversationModel} from '@/models/Conversation';
import {MessageModel} from '@/models/Message';
import {ClassroomModel} from '@/models/Classroom';
import {KnowledgePostModel} from '@/models/KnowledgePost';
import {EngagementMetricModel} from '@/models/EngagementMetric';

const seed = async () => {
  await connectDatabase();

  await Promise.all([
    UserModel.deleteMany({}),
    ConversationModel.deleteMany({}),
    MessageModel.deleteMany({}),
    ClassroomModel.deleteMany({}),
    KnowledgePostModel.deleteMany({}),
    EngagementMetricModel.deleteMany({})
  ]);

  const passwordHash = await bcrypt.hash('Password123!', 10);
  const users = await UserModel.insertMany([
    {
      username: 'juliet',
      email: 'juliet@example.com',
      passwordHash,
      status: 'online',
      skills: ['Fullstack', 'UI/UX'],
      skillLevel: 'Professional',
      role: 'admin',
      hasOnboarded: true,
      profileCompleted: true
    },
    {
      username: 'romeo',
      email: 'romeo@example.com',
      passwordHash,
      skills: ['Backend'],
      skillLevel: 'Intermediate',
      hasOnboarded: true,
      profileCompleted: true
    },
    {
      username: 'mercurio',
      email: 'mercurio@example.com',
      passwordHash,
      skills: ['Cybersecurity'],
      skillLevel: 'Beginner'
    }
  ]);

  const dm = await ConversationModel.create({type: 'dm', participants: [users[0]._id, users[1]._id]});
  const group = await ConversationModel.create({
    type: 'group',
    title: 'Capulet HQ',
    participants: users.map((u) => u._id)
  });

  await MessageModel.insertMany([
    {
      conversationId: dm._id,
      senderId: users[0]._id,
      content: 'Hey Romeo, testing our new chat! 💬',
      media: [],
      reactions: {},
      deliveredTo: [users[1]._id],
      readBy: [],
      isEncrypted: false
    },
    {
      conversationId: group._id,
      senderId: users[2]._id,
      content: 'Ambient glow animation shipped!',
      media: [],
      reactions: {},
      deliveredTo: users.map((u) => u._id as Types.ObjectId),
      readBy: [],
      isEncrypted: false
    }
  ]);

  await ClassroomModel.create({
    title: 'Secure Coding Basics',
    description: 'Live class covering OWASP Top 10.',
    instructor: users[0]._id,
    schedule: [
      {
        title: 'Kick-off',
        description: 'Overview and expectations',
        instructor: users[0]._id,
        date: new Date(),
        durationMinutes: 60,
        link: 'https://meet.google.com/dev-learn'
      }
    ]
  });

  await KnowledgePostModel.create({
    title: 'Daily Tech Bite: Why HTTPS Matters',
    summary: 'Short primer on HTTPS benefits for modern web.',
    content: 'Transport Layer Security keeps your data protected in transit.',
    tags: ['security', 'web'],
    author: users[0]._id,
    type: 'daily-bite'
  });

  await EngagementMetricModel.create({
    userId: users[0]._id,
    messagesSent: 5,
    materialsShared: 2,
    classesAttended: 1,
    badges: ['Mentor', 'Community Builder'],
    xp: 120
  });

  console.log('Seeded users and conversations');
  await mongoose.disconnect();
};

seed().catch((error) => {
  console.error('Seed failed', error);
  process.exit(1);
});


