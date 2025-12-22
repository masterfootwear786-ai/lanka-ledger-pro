import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, PhoneOff, Mic, MicOff, Send, Image as ImageIcon, 
  MessageCircle, Users, Loader2, Paperclip, Download, FileText, 
  Trash2, X, Play, Pause, Square
} from 'lucide-react';
import { useChat, ChatConversation, ChatMessage } from '@/hooks/useChat';
import { useVoiceCall } from '@/hooks/useVoiceCall';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { usePresence } from '@/hooks/usePresence';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Communications = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const { conversations, activeConversation, setActiveConversation, messages, sendMessage, deleteMessage, unsendMessage, sendingMessage, startConversation, loading } = useChat();
  const { callState, startCall, endCall, toggleMute } = useVoiceCall();
  const { isUserOnline } = usePresence();
  const { isRecording, duration: recordingDuration, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();
  const [messageInput, setMessageInput] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unsendDialogOpen, setUnsendDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [messageToUnsend, setMessageToUnsend] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
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

    // Validate file size (max 50MB for high quality)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 50MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      await sendMessage(file.name, 'image', publicUrl, file.name, file.size);
      
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
      setUploadingFile(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeConversation) return;

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingFile(true);
    try {
      const fileName = `${user.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      await sendMessage(file.name, 'file', publicUrl, file.name, file.size);
      
      toast({
        title: "File sent",
        description: "Your file has been sent successfully"
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (url: string, fileName?: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Download started",
        description: "Your file is being downloaded"
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download file",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;
    
    const success = await deleteMessage(messageToDelete);
    if (success) {
      toast({
        title: "Message deleted",
        description: "Message deleted for you"
      });
    }
    setDeleteDialogOpen(false);
    setMessageToDelete(null);
  };

  const handleUnsendMessage = async () => {
    if (!messageToUnsend) return;
    
    const success = await unsendMessage(messageToUnsend);
    if (success) {
      toast({
        title: "Message unsent",
        description: "Message deleted for everyone"
      });
    }
    setUnsendDialogOpen(false);
    setMessageToUnsend(null);
  };

  const confirmDelete = (messageId: string) => {
    setMessageToDelete(messageId);
    setDeleteDialogOpen(true);
  };

  const confirmUnsend = (messageId: string) => {
    setMessageToUnsend(messageId);
    setUnsendDialogOpen(true);
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName?: string | null) => {
    if (!fileName) return <FileText className="h-8 w-8" />;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="h-8 w-8 text-red-500" />;
    return <FileText className="h-8 w-8" />;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      setUploadingVoice(true);
      try {
        const blob = await stopRecording();
        if (!blob || !user || !activeConversation) return;

        const fileName = `${user.id}/${Date.now()}_voice.webm`;
        const { error: uploadError } = await supabase.storage
          .from('chat-files')
          .upload(fileName, blob, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'audio/webm'
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-files')
          .getPublicUrl(fileName);

        await sendMessage('Voice message', 'voice', publicUrl, 'voice.webm', blob.size, recordingDuration);
        
        toast({
          title: "Voice message sent",
          description: "Your voice message has been sent"
        });
      } catch (error) {
        console.error('Error sending voice message:', error);
        toast({
          title: "Failed to send voice message",
          description: "Please try again",
          variant: "destructive"
        });
      } finally {
        setUploadingVoice(false);
      }
    } else {
      try {
        await startRecording();
      } catch (error) {
        toast({
          title: "Microphone access denied",
          description: "Please allow microphone access to record voice messages",
          variant: "destructive"
        });
      }
    }
  };

  const handlePlayVoice = (messageId: string, url: string) => {
    if (playingAudioId === messageId) {
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlayingAudioId(null);
      audioRef.current.play();
      setPlayingAudioId(messageId);
    }
  };

  const renderMessage = (msg: ChatMessage) => {
    const isOwn = msg.sender_id === user?.id;
    
    // Handle deleted messages
    if (msg.message_type === 'deleted') {
      return (
        <div key={msg.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
          <div
            className={cn(
              "max-w-[70%] rounded-lg px-3 py-2 italic opacity-60",
              isOwn ? "bg-primary/50 text-primary-foreground" : "bg-muted"
            )}
          >
            <p className="text-sm">🚫 This message was deleted</p>
            <p className="text-xs opacity-70 mt-1">
              {format(new Date(msg.created_at), 'HH:mm')}
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <ContextMenu key={msg.id}>
        <ContextMenuTrigger>
          <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[70%] rounded-lg px-3 py-2 group relative",
                isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              {msg.message_type === 'image' && msg.image_url && (
                <div className="relative">
                  <img 
                    src={msg.image_url} 
                    alt="Shared" 
                    className="rounded max-w-full mb-1 cursor-pointer hover:opacity-90 transition-opacity" 
                    onClick={() => setImagePreview(msg.image_url)}
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(msg.image_url!, msg.content || 'image.jpg');
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {msg.message_type === 'file' && msg.image_url && (
                <div 
                  className="flex items-center gap-3 p-2 bg-background/10 rounded cursor-pointer hover:bg-background/20 transition-colors"
                  onClick={() => handleDownload(msg.image_url!, msg.content || 'file')}
                >
                  {getFileIcon(msg.content)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{msg.content || 'File'}</p>
                    <p className="text-xs opacity-70">Click to download</p>
                  </div>
                  <Download className="h-5 w-5 shrink-0" />
                </div>
              )}
              {msg.message_type === 'voice' && msg.image_url && (
                <div 
                  className="flex items-center gap-3 p-2 bg-background/10 rounded cursor-pointer hover:bg-background/20 transition-colors min-w-[150px]"
                  onClick={() => handlePlayVoice(msg.id, msg.image_url!)}
                >
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
                    {playingAudioId === msg.id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <div className="flex-1">
                    <div className="flex gap-0.5 items-center h-4">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "w-0.5 bg-current rounded-full transition-all",
                            playingAudioId === msg.id ? "animate-pulse" : ""
                          )}
                          style={{ height: `${Math.random() * 12 + 4}px` }}
                        />
                      ))}
                    </div>
                    <p className="text-xs opacity-70 mt-1">
                      {msg.duration_seconds ? formatDuration(msg.duration_seconds) : '0:00'}
                    </p>
                  </div>
                </div>
              )}
              {msg.message_type === 'text' && msg.content && (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
              <p className="text-xs opacity-70 mt-1">
                {format(new Date(msg.created_at), 'HH:mm')}
              </p>
            </div>
          </div>
        </ContextMenuTrigger>
        {isOwn && (
          <ContextMenuContent>
            <ContextMenuItem 
              className="text-orange-600 focus:text-orange-600"
              onClick={() => confirmUnsend(msg.id)}
            >
              <X className="h-4 w-4 mr-2" />
              Unsend for Everyone
            </ContextMenuItem>
            <ContextMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={() => confirmDelete(msg.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete for Me
            </ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>
    );
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
                        {conv.last_message?.message_type === 'image' ? '📷 Image' :
                         conv.last_message?.message_type === 'file' ? '📎 File' :
                         conv.last_message?.content || 'No messages yet'}
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
                    disabled={!activeConversation.other_user?.id}
                    onClick={() => {
                      if (activeConversation.other_user?.id) {
                        startCall(
                          activeConversation.other_user.id,
                          activeConversation.other_user.full_name || 'Unknown'
                        );
                      }
                    }}
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
                  {messages.map(msg => renderMessage(msg))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              <div className="flex gap-2 pt-4 border-t mt-4">
                <input
                  type="file"
                  accept="image/*"
                  ref={imageInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingFile}
                  title="Send Image"
                >
                  {uploadingFile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile || isRecording}
                  title="Send Document"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                {/* Voice Recording Button */}
                {isRecording ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 rounded-lg">
                    <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-destructive">{formatDuration(recordingDuration)}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={cancelRecording}
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="default"
                      className="h-8 w-8 bg-primary"
                      onClick={handleVoiceRecord}
                      disabled={uploadingVoice}
                      title="Send Voice Message"
                    >
                      {uploadingVoice ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={handleVoiceRecord}
                      disabled={uploadingFile}
                      title="Record Voice Message"
                    >
                      <Mic className="h-4 w-4" />
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
                  </>
                )}
              </div>
            </CardContent>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation or start a new chat
          </div>
        )}
      </Card>

      {/* Image Preview Modal */}
      {imagePreview && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setImagePreview(null)}
        >
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setImagePreview(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-4 right-16"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(imagePreview, 'image.jpg');
            }}
          >
            <Download className="h-5 w-5" />
          </Button>
          <img 
            src={imagePreview} 
            alt="Preview" 
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this message for yourself? The other person will still see it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete for Me
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsend Confirmation Dialog */}
      <AlertDialog open={unsendDialogOpen} onOpenChange={setUnsendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsend Message</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the message for everyone. The other person will see "This message was deleted".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnsendMessage} className="bg-orange-600 text-white hover:bg-orange-700">
              Unsend for Everyone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Communications;