import {Schema, model, Document, Types} from 'mongoose';

export interface IKnowledgePost extends Document {
  title: string;
  summary: string;
  content?: string;
  tags: string[];
  author: Types.ObjectId;
  type: 'tutorial' | 'blog' | 'quiz' | 'daily-bite';
  likes: Types.ObjectId[];
  bookmarks: Types.ObjectId[];
  comments: {
    author: Types.ObjectId;
    message: string;
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema(
  {
    author: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    message: {type: String, required: true},
    createdAt: {type: Date, default: Date.now}
  },
  {_id: false}
);

const knowledgePostSchema = new Schema<IKnowledgePost>(
  {
    title: {type: String, required: true},
    summary: {type: String, required: true},
    content: {type: String},
    tags: {type: [String], default: []},
    author: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    type: {type: String, enum: ['tutorial', 'blog', 'quiz', 'daily-bite'], default: 'tutorial'},
    likes: [{type: Schema.Types.ObjectId, ref: 'User'}],
    bookmarks: [{type: Schema.Types.ObjectId, ref: 'User'}],
    comments: {type: [commentSchema], default: []}
  },
  {timestamps: true}
);

knowledgePostSchema.index({tags: 1});
knowledgePostSchema.index({type: 1});

export const KnowledgePostModel = model<IKnowledgePost>('KnowledgePost', knowledgePostSchema);

