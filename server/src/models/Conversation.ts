import {Schema, model, Document, Types} from 'mongoose';

export interface IConversation extends Document {
  type: 'dm' | 'group';
  title?: string;
  participants: Types.ObjectId[];
  pinnedBy: Types.ObjectId[];
  archivedBy: Types.ObjectId[];
  locked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    type: {
      type: String,
      enum: ['dm', 'group'],
      required: true
    },
    title: {type: String},
    participants: [{type: Schema.Types.ObjectId, ref: 'User', required: true}],
    pinnedBy: [{type: Schema.Types.ObjectId, ref: 'User'}],
    archivedBy: [{type: Schema.Types.ObjectId, ref: 'User'}],
    locked: {type: Boolean, default: false}
  },
  {timestamps: true}
);

conversationSchema.index({participants: 1});
conversationSchema.index({updatedAt: -1});

export const ConversationModel = model<IConversation>('Conversation', conversationSchema);


