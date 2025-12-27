export type Status = 'online' | 'offline' | 'away';
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Professional';

export interface User {
  _id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  status: Status;
  lastSeen?: string;
  settings?: Record<string, unknown>;
  blockedUsers?: string[];
  skills?: string[];
  skillLevel?: SkillLevel;
  hasOnboarded?: boolean;
  profileCompleted?: boolean;
  onboardingCompleted?: boolean;
  friends?: UserSummary[];
  friendRequests?: UserSummary[];
  role?: 'member' | 'admin';
  bio?: string;
  socialLinks?: SocialLink[];
  badges?: string[];
  xp?: number;
}

export interface UserSummary {
  _id: string;
  username: string;
  avatarUrl?: string;
  skills?: string[];
  skillLevel?: SkillLevel;
  status?: Status;
  lastSeen?: string;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface Conversation {
  _id: string;
  type: 'dm' | 'group';
  conversationType?: 'friend' | 'community' | 'room';
  title?: string;
  participants: string[];
  otherParticipant?: {
    userId: string;
    username: string;
    online?: boolean;
    lastSeen?: string;
  };
  lastMessage?: {
    content: string;
    senderId: string;
    senderName: string;
    timestamp: string;
  };
  unreadCount?: number;
  pinnedBy: string[];
  archivedBy: string[];
  locked?: boolean;
  updatedAt: string;
}

export interface MediaAttachment {
  key: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'file';
  mimeType?: string;
  size: number;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  content?: string;
  media: MediaAttachment[];
  replyToMessageId?: string;
  editedAt?: string;
  deletedAt?: string;
  reactions: Record<string, string[]>;
  deliveredTo: string[];
  readBy: string[];
  isPinned: boolean;
  isEncrypted: boolean;
  createdAt: string;
  lastModified: string;
}

export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken?: string;
  };
}

export interface Paginated<T> {
  data: T[];
  nextCursor?: string;
}

export interface ClassroomSession {
  _id: string;
  title: string;
  description?: string;
  instructor: string;
  date: string;
  durationMinutes?: number;
  link?: string;
  materials: ClassroomMaterial[];
  participants: string[];
  attendance: Array<{userId: string; status: 'present' | 'absent'}>;
}

export interface Classroom {
  _id: string;
  title: string;
  description?: string;
  instructor: UserSummary;
  schedule: ClassroomSession[];
}

export interface ClassroomMaterial {
  title: string;
  url: string;
  type: 'document' | 'video' | 'link';
  uploadedBy: string;
}

export interface KnowledgePost {
  _id: string;
  title: string;
  summary: string;
  content?: string;
  tags: string[];
  author: UserSummary | string;
  type: 'tutorial' | 'blog' | 'quiz' | 'daily-bite';
  likes: string[];
  bookmarks: string[];
  comments: Array<{author: UserSummary | string; message: string; createdAt: string}>;
  createdAt: string;
}

export interface EngagementMetric {
  userId: UserSummary;
  messagesSent: number;
  materialsShared: number;
  classesAttended: number;
  badges: string[];
  xp: number;
}

export interface LiveSessionApplication {
  applicationId: string;
  userId: string;
  username: string;
  techSkill: string;
  message?: string;
  availability?: string;
  status: 'pending' | 'accepted' | 'rejected';
  roomId?: string | null;
  approvedBy?: string | null;
  approvedByUsername?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomDetails {
  roomId: string;
  techSkill: string;
  participants: Array<{
    userId: string;
    username: string;
    techSkill: string;
    joinedAt: string;
  }>;
  participantCount: number;
}

