import {AppShell} from '@/components/layout/AppShell';
import {ConversationList} from '@/components/chat/ConversationList';

export const FriendChatsPage = () => {
  return (
    <div className="relative -mx-3 sm:-mx-4 md:-mx-6 -mb-8 sm:-mb-14 -mt-4" style={{minHeight: 'calc(100vh - 20rem)'}}>
      <AppShell sidebar={<ConversationList filter="dm" />} />
    </div>
  );
};

