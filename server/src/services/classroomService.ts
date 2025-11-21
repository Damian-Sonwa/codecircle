import {Types} from 'mongoose';
import {ClassroomModel} from '@/models/Classroom';
import {EngagementMetricModel} from '@/models/EngagementMetric';

export const listClassrooms = () => ClassroomModel.find().populate('instructor', 'username avatarUrl');

export const createClassroom = (payload: {
  title: string;
  description?: string;
  instructor: Types.ObjectId;
}) => ClassroomModel.create(payload);

export const addSession = async (
  classroomId: string,
  session: {
    title: string;
    description?: string;
    instructor: Types.ObjectId;
    date: Date;
    durationMinutes?: number;
    link?: string;
  }
) => {
  return ClassroomModel.findByIdAndUpdate(
    classroomId,
    {$push: {schedule: {...session, materials: [], participants: [], attendance: []}}},
    {new: true}
  );
};

export const updateSessionMaterials = async (
  classroomId: string,
  sessionId: string,
  materials: {title: string; url: string; type: 'document' | 'video' | 'link'; uploadedBy: Types.ObjectId}[]
) => {
  await Promise.all(
    materials.map((material) =>
      EngagementMetricModel.findOneAndUpdate(
        {userId: material.uploadedBy},
        {$inc: {materialsShared: 1, xp: 10}},
        {upsert: true}
      )
    )
  );
  return ClassroomModel.findOneAndUpdate(
    {_id: classroomId, 'schedule._id': sessionId},
    {$set: {'schedule.$.materials': materials}},
    {new: true}
  );
};

export const registerParticipant = async (classroomId: string, sessionId: string, userId: Types.ObjectId) => {
  await EngagementMetricModel.findOneAndUpdate(
    {userId},
    {$inc: {classesAttended: 1, xp: 15}},
    {upsert: true}
  );
  return ClassroomModel.findOneAndUpdate(
    {_id: classroomId, 'schedule._id': sessionId},
    {$addToSet: {'schedule.$.participants': userId}},
    {new: true}
  );
};

export const recordAttendance = async (
  classroomId: string,
  sessionId: string,
  attendance: {userId: Types.ObjectId; status: 'present' | 'absent'}
) => {
  return ClassroomModel.findOneAndUpdate(
    {_id: classroomId, 'schedule._id': sessionId},
    {$push: {'schedule.$.attendance': attendance}},
    {new: true}
  );
};

