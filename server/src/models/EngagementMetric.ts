import {Schema, model, Document, Types} from 'mongoose';

export interface IEngagementMetric extends Document {
  userId: Types.ObjectId;
  messagesSent: number;
  materialsShared: number;
  classesAttended: number;
  badges: string[];
  xp: number;
  lastUpdated: Date;
}

const engagementMetricSchema = new Schema<IEngagementMetric>(
  {
    userId: {type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true},
    messagesSent: {type: Number, default: 0},
    materialsShared: {type: Number, default: 0},
    classesAttended: {type: Number, default: 0},
    badges: {type: [String], default: []},
    xp: {type: Number, default: 0},
    lastUpdated: {type: Date, default: Date.now}
  },
  {timestamps: true}
);

engagementMetricSchema.index({xp: -1});

export const EngagementMetricModel = model<IEngagementMetric>('EngagementMetric', engagementMetricSchema);

