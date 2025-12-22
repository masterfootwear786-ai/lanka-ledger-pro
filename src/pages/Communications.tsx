import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneOff, Mic, MicOff, Send, Image as ImageIcon, MessageCircle, Users, Loader2 } from 'lucide-react';
import { useChat, ChatConversation } from '@/hooks/useChat';
import { useVoiceCall } from '@/hooks/useVoiceCall';
import { usePresence } from '@/hooks/usePresence';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const Communications = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const { conversations, activeConversation, setActiveConversation, messages, sendMessage, sendingMessage, startConversation, loading } = useChat();
  const { callState, startCall, endCall, toggleMute } = useVoiceCall();
  const { isUserOnline } = usePresence();
  const [messageInput, setMessageInput] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch company users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!profile?.company_id || !user) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('company_id', profile.company_id)
        .neq('id', user.id);
      setUsers(data || []);
    };
    fetchUsers();
  }, [profile?.company_id, user]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!messageInput.trim()) return;
    sendMessage(messageInput.trim());
    setMessageInput('');
  };

  const handleStartChat = async (userId: string) => {
    const conv = await startConversation(userId);
    if (conv) {
      const enrichedConv = conversations.find(c => c.id === conv.id) || conv;
      setActiveConversation(enrichedConv as ChatConversation);
    }
    setShowUserList(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeConversation) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      await sendMessage('', 'image', publicUrl);
      
      toast({
        title: "Image sent",
        description: "Your image has been sent successfully"
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-[calc(100vh-120px)] flex gap-4 p-4">
      {/* Conversations List */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chats
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowUserList(!showUserList)}>
            <Users className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 p-2 overflow-hidden">
          {showUserList ? (
            <ScrollArea className="h-full">
              <div className="space-y-1">
                {users.map(u => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => handleStartChat(u.id)}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback>{u.full_name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      {isUserOnline(u.id) && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <span className="font-medium">{u.full_name || 'Unknown'}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-1">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                      activeConversation?.id === conv.id ? "bg-primary/10" : "hover:bg-muted"
                    )}
                    onClick={() => setActiveConversation(conv)}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conv.other_user?.avatar_url || ''} />
                        <AvatarFallback>{conv.other_user?.full_name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      {conv.other_user?.is_online && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <span className="font-medium truncate">{conv.other_user?.full_name || 'Unknown'}</span>
                        {(conv.unread_count || 0) > 0 && (
                          <Badge variant="destructive" className="ml-1">{conv.unread_count}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.last_message?.content || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                ))}
                {conversations.length === 0 && !loading && (
                  <p className="text-center text-muted-foreground py-8">No conversations yet</p>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            <CardHeader className="pb-2 border-b flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={activeConversation.other_user?.avatar_url || ''} />
                  <AvatarFallback>{activeConversation.other_user?.full_name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{activeConversation.other_user?.full_name || 'Unknown'}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {activeConversation.other_user?.is_online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {callState.status === 'idle' ? (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => startCall(
                      activeConversation.other_user?.id || '',
                      activeConversation.other_user?.full_name || 'Unknown'
                    )}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{formatDuration(callState.duration)}</span>
                    <Button size="icon" variant="outline" onClick={toggleMute}>
                      {callState.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="destructive" onClick={endCall}>
                      <PhoneOff className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-3">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.sender_id === user?.id ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-3 py-2",
                          msg.sender_id === user?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {msg.message_type === 'image' && msg.image_url && (
                          <img src={msg.image_url} alt="Shared" className="rounded max-w-full mb-1" />
                        )}
                        {msg.content && <p className="text-sm">{msg.content}</p>}
                        <p className="text-xs opacity-70 mt-1">
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="flex gap-2 pt-4 border-t mt-4">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                </Button>
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={sendingMessage || !messageInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation or start a new chat
          </div>
        )}
      </Card>
    </div>
  );
};

export default Communications;
