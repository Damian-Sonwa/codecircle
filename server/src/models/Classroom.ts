import {Schema, model, Document, Types} from 'mongoose';

export interface Material {
  title: string;
  url: string;
  type: 'document' | 'video' | 'link';
  uploadedBy: Types.ObjectId;
}

export interface ClassroomSession {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  instructor: Types.ObjectId;
  date: Date;
  durationMinutes?: number;
  link?: string;
  materials: Material[];
  participants: Types.ObjectId[];
  chatId?: Types.ObjectId;
  attendance: {
    userId: Types.ObjectId;
    status: 'present' | 'absent';
  }[];
}

export interface IClassroom extends Document {
  title: string;
  description?: string;
  instructor: Types.ObjectId;
  schedule: ClassroomSession[];
  createdAt: Date;
  updatedAt: Date;
}

const materialSchema = new Schema<Material>(
  {
    title: {type: String, required: true},
    url: {type: String, required: true},
    type: {type: String, enum: ['document', 'video', 'link'], default: 'link'},
    uploadedBy: {type: Schema.Types.ObjectId, ref: 'User', required: true}
  },
  {_id: false}
);

const attendanceSchema = new Schema(
  {
    userId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    status: {type: String, enum: ['present', 'absent'], default: 'present'}
  },
  {_id: false}
);

const sessionSchema = new Schema<ClassroomSession>(
  {
    title: {type: String, required: true},
    description: {type: String},
    instructor: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    date: {type: Date, required: true},
    durationMinutes: {type: Number},
    link: {type: String},
    materials: {type: [materialSchema], default: []},
    participants: [{type: Schema.Types.ObjectId, ref: 'User'}],
    chatId: {type: Schema.Types.ObjectId, ref: 'Conversation'},
    attendance: {type: [attendanceSchema], default: []}
  },
  {timestamps: true}
);

const classroomSchema = new Schema<IClassroom>(
  {
    title: {type: String, required: true},
    description: {type: String},
    instructor: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    schedule: {type: [sessionSchema], default: []}
  },
  {timestamps: true}
);

export const ClassroomModel = model<IClassroom>('Classroom', classroomSchema);

