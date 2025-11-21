import {Schema, model, Document, Types} from 'mongoose';

export interface IFriendInvite extends Document {
  fromUser: Types.ObjectId;
  toUser?: Types.ObjectId;
  inviteCode: string;
  status: 'pending' | 'accepted' | 'revoked';
  channel?: 'link' | 'whatsapp' | 'linkedin' | 'twitter' | 'instagram' | 'tiktok';
  createdAt: Date;
  updatedAt: Date;
}

const friendInviteSchema = new Schema<IFriendInvite>(
  {
    fromUser: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    toUser: {type: Schema.Types.ObjectId, ref: 'User'},
    inviteCode: {type: String, required: true, unique: true},
    status: {type: String, enum: ['pending', 'accepted', 'revoked'], default: 'pending'},
    channel: {
      type: String,
      enum: ['link', 'whatsapp', 'linkedin', 'twitter', 'instagram', 'tiktok']
    }
  },
  {timestamps: true}
);

friendInviteSchema.index({inviteCode: 1});

export const FriendInviteModel = model<IFriendInvite>('FriendInvite', friendInviteSchema);

