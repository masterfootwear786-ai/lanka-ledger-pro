import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Crown, Loader2 } from 'lucide-react';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/contexts/AuthContext';
import { GroupMember } from '@/hooks/useGroupChat';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface GroupMembersPanelProps {
  members: GroupMember[];
  onStartChat: (userId: string) => Promise<void>;
}

export const GroupMembersPanel = ({ members, onStartChat }: GroupMembersPanelProps) => {
  const { user } = useAuth();
  const { isUserOnline } = usePresence();
  const [startingChat, setStartingChat] = useState<string | null>(null);

  const handleStartChat = async (userId: string) => {
    setStartingChat(userId);
    await onStartChat(userId);
    setStartingChat(null);
  };

  return (
    <div className="border-l pl-3">
      <p className="text-xs font-semibold text-muted-foreground mb-2">Group Members</p>
      <ScrollArea className="h-32">
        <div className="space-y-1">
          {members.map((member) => {
            const isCurrentUser = member.user_id === user?.id;
            const online = isUserOnline(member.user_id);
            
            return (
              <div
                key={member.id}
                className={cn(
                  "flex items-center gap-2 p-1.5 rounded-md text-sm",
                  !isCurrentUser && "hover:bg-muted cursor-pointer group"
                )}
                onClick={() => !isCurrentUser && handleStartChat(member.user_id)}
              >
                <div className="relative">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={member.profile?.avatar_url || ''} />
                    <AvatarFallback className="text-xs">
                      {member.profile?.full_name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {online && (
                    <span className="absolute bottom-0 right-0 h-2 w-2 bg-green-500 rounded-full border border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-1">
                  <span className="truncate text-xs">
                    {member.profile?.full_name || 'Unknown'}
                    {isCurrentUser && ' (You)'}
                  </span>
                  {member.role === 'admin' && (
                    <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />
                  )}
                </div>
                {!isCurrentUser && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartChat(member.user_id);
                    }}
                    disabled={startingChat === member.user_id}
                  >
                    {startingChat === member.user_id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <MessageCircle className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
