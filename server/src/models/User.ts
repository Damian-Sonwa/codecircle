import {Schema, model, Document, Types} from 'mongoose';

export interface Settings {
  theme?: 'light' | 'dark' | 'system';
  notifications?: {
    push?: boolean;
    email?: boolean;
    sound?: boolean;
  };
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
  settings?: Settings;
  blockedUsers: Types.ObjectId[];
  skills: string[];
  skillLevel?: 'Beginner' | 'Intermediate' | 'Professional';
  onboardingAnswers?: Record<string, string>;
  hasOnboarded: boolean;
  profileCompleted: boolean;
  friends: Types.ObjectId[];
  friendRequests: Types.ObjectId[];
  role: 'member' | 'admin';
  socialLinks?: SocialLink[];
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<Settings>(
  {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'dark'
    },
    notifications: {
      push: {type: Boolean, default: true},
      email: {type: Boolean, default: false},
      sound: {type: Boolean, default: true}
    }
  },
  {_id: false}
);

const socialLinkSchema = new Schema<SocialLink>(
  {
    platform: {type: String, required: true},
    url: {type: String, required: true}
  },
  {_id: false}
);

const userSchema = new Schema<IUser>(
  {
    username: {type: String, required: true, unique: true, trim: true},
    email: {type: String, required: true, unique: true, lowercase: true},
    passwordHash: {type: String, required: true},
    avatarUrl: {type: String},
    status: {
      type: String,
      enum: ['online', 'offline', 'away'],
      default: 'offline'
    },
    lastSeen: {type: Date},
    settings: {type: settingsSchema, default: () => ({})},
    blockedUsers: [{type: Schema.Types.ObjectId, ref: 'User'}],
    skills: {type: [String], default: []},
    skillLevel: {type: String, enum: ['Beginner', 'Intermediate', 'Professional'], default: 'Beginner'},
    onboardingAnswers: {type: Schema.Types.Mixed},
    hasOnboarded: {type: Boolean, default: false},
    profileCompleted: {type: Boolean, default: false},
    friends: [{type: Schema.Types.ObjectId, ref: 'User'}],
    friendRequests: [{type: Schema.Types.ObjectId, ref: 'User'}],
    role: {type: String, enum: ['member', 'admin'], default: 'member'},
    socialLinks: {type: [socialLinkSchema], default: []},
    bio: {type: String, maxlength: 500}
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as Record<string, unknown>).passwordHash;
        return ret;
      }
    }
  }
);

userSchema.index({skills: 1});
userSchema.index({role: 1});

export const UserModel = model<IUser>('User', userSchema);


