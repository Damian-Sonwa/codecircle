import React from 'react';
import {useSocket} from '@/providers/SocketProvider';
import {Wifi, WifiOff, Loader2} from 'lucide-react';
import {cn} from '@/utils/styles';

export const ConnectionStatus: React.FC<{className?: string}> = ({className}) => {
  const {connectionStatus} = useSocket();

  if (connectionStatus === 'connected') {
    return null; // Don't show anything when connected
  }

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connecting':
        return {
          icon: Loader2,
          text: 'Connecting...',
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          text: 'Disconnected',
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/30',
        };
      case 'error':
        return {
          icon: WifiOff,
          text: 'Connection failed',
          color: 'text-rose-500',
          bgColor: 'bg-rose-500/10',
          borderColor: 'border-rose-500/30',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
        config.bgColor,
        config.borderColor,
        config.color,
        className
      )}
    >
      <Icon className={cn('h-4 w-4', connectionStatus === 'connecting' && 'animate-spin')} />
      <span>{config.text}</span>
    </div>
  );
};

export default ConnectionStatus;

