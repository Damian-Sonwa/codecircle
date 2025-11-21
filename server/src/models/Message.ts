import {Schema, model, Document, Types} from 'mongoose';

export interface MediaAttachment {
  key: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'file';
  size: number;
  metadata?: Record<string, unknown>;
}

export interface ReactionMap {
  [emoji: string]: Types.ObjectId[];
}

export interface IMessage extends Document {
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content?: string;
  media: MediaAttachment[];
  replyToMessageId?: Types.ObjectId;
  editedAt?: Date;
  deletedAt?: Date;
  reactions: ReactionMap;
  deliveredTo: Types.ObjectId[];
  readBy: Types.ObjectId[];
  isPinned: boolean;
  isEncrypted: boolean;
  createdAt: Date;
  lastModified: Date;
}

const mediaSchema = new Schema<MediaAttachment>(
  {
    key: {type: String, required: true},
    url: {type: String, required: true},
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'file'],
      required: true
    },
    size: {type: Number, required: true},
    metadata: {type: Schema.Types.Mixed}
  },
  {_id: false}
);

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {type: Schema.Types.ObjectId, ref: 'Conversation', required: true},
    senderId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    content: {type: String},
    media: {type: [mediaSchema], default: []},
    replyToMessageId: {type: Schema.Types.ObjectId, ref: 'Message'},
    editedAt: {type: Date},
    deletedAt: {type: Date},
    reactions: {type: Schema.Types.Mixed, default: {}},
    deliveredTo: [{type: Schema.Types.ObjectId, ref: 'User'}],
    readBy: [{type: Schema.Types.ObjectId, ref: 'User'}],
    isPinned: {type: Boolean, default: false},
    isEncrypted: {type: Boolean, default: false}
  },
  {
    timestamps: {createdAt: true, updatedAt: 'lastModified'}
  }
);

messageSchema.index({conversationId: 1, createdAt: -1});
messageSchema.index({senderId: 1});

export const MessageModel = model<IMessage>('Message', messageSchema);


