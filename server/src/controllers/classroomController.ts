import {Response} from 'express';
import {Types} from 'mongoose';
import {AuthenticatedRequest} from '@/types';
import {
  addSession,
  createClassroom,
  listClassrooms,
  recordAttendance,
  registerParticipant,
  updateSessionMaterials
} from '@/services/classroomService';

export const handleListClassrooms = async (_req: AuthenticatedRequest, res: Response) => {
  const classes = await listClassrooms();
  res.json(classes);
};

export const handleCreateClassroom = async (req: AuthenticatedRequest, res: Response) => {
  const classroom = await createClassroom({
    title: req.body.title,
    description: req.body.description,
    instructor: req.userId!
  });
  res.status(201).json(classroom);
};

export const handleAddSession = async (req: AuthenticatedRequest, res: Response) => {
  const classroom = await addSession(req.params.classroomId, {
    title: req.body.title,
    description: req.body.description,
    instructor: req.userId!,
    date: new Date(req.body.date),
    durationMinutes: req.body.durationMinutes,
    link: req.body.link
  });
  res.status(201).json(classroom);
};

export const handleUpdateMaterials = async (req: AuthenticatedRequest, res: Response) => {
  const materials = await updateSessionMaterials(
    req.params.classroomId,
    req.params.sessionId,
    req.body.materials.map((item: any) => ({
      title: item.title,
      url: item.url,
      type: item.type,
      uploadedBy: req.userId!
    }))
  );
  res.json(materials);
};

export const handleRegisterParticipant = async (req: AuthenticatedRequest, res: Response) => {
  const classroom = await registerParticipant(
    req.params.classroomId,
    req.params.sessionId,
    req.userId!
  );
  res.json(classroom);
};

export const handleAttendance = async (req: AuthenticatedRequest, res: Response) => {
  const classroom = await recordAttendance(
    req.params.classroomId,
    req.params.sessionId,
    {
      userId: new Types.ObjectId(req.body.userId),
      status: req.body.status
    }
  );
  res.json(classroom);
};

