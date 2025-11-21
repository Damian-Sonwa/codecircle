import {useSearchParams} from 'react-router-dom';
import {AppShell} from '@/components/layout/AppShell';
import {ConversationList} from '@/components/chat/ConversationList';

export const ChatPage = () => {
  const [params] = useSearchParams();
  const typeParam = params.get('type');
  const filter = typeParam === 'private' ? 'dm' : typeParam === 'group' ? 'group' : 'all';
  return <AppShell sidebar={<ConversationList filter={filter} />} />;
};


