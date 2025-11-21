import {Types} from 'mongoose';
import {UserModel} from '@/models/User';
import {ConversationModel} from '@/models/Conversation';

const ensureWelcomeConversation = async () => {
  let convo = await ConversationModel.findOne({title: 'Welcome Lounge', type: 'group'});
  if (!convo) {
    convo = await ConversationModel.create({
      type: 'group',
      title: 'Welcome Lounge',
      participants: []
    });
  }
  return convo;
};

export interface OnboardingPayload {
  skills: string[];
  skillLevel: 'Beginner' | 'Intermediate' | 'Professional';
  answers: Record<string, string>;
}

export const completeOnboarding = async (userId: Types.ObjectId, payload: OnboardingPayload) => {
  const [user, welcomeConversation] = await Promise.all([
    UserModel.findByIdAndUpdate(
      userId,
      {
        skills: payload.skills,
        skillLevel: payload.skillLevel,
        onboardingAnswers: payload.answers,
        hasOnboarded: true,
        profileCompleted: true
      },
      {new: true}
    ),
    ensureWelcomeConversation()
  ]);
  if (!welcomeConversation.participants.some((participant) => participant.equals(userId))) {
    welcomeConversation.participants.push(userId);
    await welcomeConversation.save();
  }
  return user;
};

export const markTourCompleted = async (userId: Types.ObjectId) => {
  return UserModel.findByIdAndUpdate(userId, {hasOnboarded: true}, {new: true});
};

