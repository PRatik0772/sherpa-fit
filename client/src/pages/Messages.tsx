import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Send, MessageCircle, Clock, Check, CheckCheck } from "lucide-react";
import { useStore, authFetch } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

type Conversation = {
  partnerId: string;
  partnerName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
};

type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
};

export default function Messages() {
  const { userId, user } = useStore();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<{ partnerId: string; partnerName: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await authFetch(`/api/conversations/${userId}`);
      const data = await res.json();
      setConversations(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const fetchMessages = useCallback(async (partnerId: string) => {
    if (!userId) return;
    try {
      const res = await authFetch(`/api/messages/${userId}/${partnerId}`);
      const data = await res.json();
      setChatMessages(data);
      await authFetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: partnerId, receiverId: userId }),
      });
    } catch {
      // silent
    }
  }, [userId]);

  const openChat = useCallback((partnerId: string, partnerName: string) => {
    setActiveChat({ partnerId, partnerName });
    fetchMessages(partnerId);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => fetchMessages(partnerId), 3000);
  }, [fetchMessages]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const sendMessage = async () => {
    if (!userId || !activeChat || !newMessage.trim()) return;
    setSending(true);
    try {
      const res = await authFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: userId,
          receiverId: activeChat.partnerId,
          content: newMessage.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const msg = await res.json();
      setChatMessages((prev) => [...prev, msg]);
      setNewMessage("");
      inputRef.current?.focus();
    } catch {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const closeChat = () => {
    setActiveChat(null);
    setChatMessages([]);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    fetchConversations();
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "now";
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const formatMessageTime = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const userRole = user?.role || "client";
  const isCoachOrAdmin = userRole === "coach" || userRole === "admin";

  if (activeChat) {
    return (
      <div className="flex flex-col h-[100dvh] bg-white safe-pad-top">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
          <button onClick={closeChat} className="p-2 -ml-2 rounded-full hover:bg-gray-100" data-testid="button-back-messages">
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div className="w-9 h-9 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-[#1e3a5f] font-bold text-sm">
              {activeChat.partnerName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate" data-testid="text-chat-partner">{activeChat.partnerName}</p>
            <p className="text-xs text-green-500">Online</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50/50">
          {chatMessages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="text-[#1e3a5f]" size={28} />
              </div>
              <p className="text-gray-500 text-sm">No messages yet</p>
              <p className="text-gray-400 text-xs mt-1">Send the first message to start the conversation</p>
            </div>
          )}
          {chatMessages.map((msg) => {
            const isMine = msg.senderId === userId;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`} data-testid={`message-${msg.id}`}>
                <div
                  className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl ${
                    isMine
                      ? "bg-[#1e3a5f] text-white rounded-br-md"
                      : "bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                  <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                    <span className={`text-[10px] ${isMine ? "text-white/60" : "text-gray-400"}`}>
                      {formatMessageTime(msg.createdAt)}
                    </span>
                    {isMine && (
                      msg.read ? (
                        <CheckCheck size={12} className="text-blue-300" />
                      ) : (
                        <Check size={12} className="text-white/50" />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-4 py-3 pb-4 bg-white border-t border-gray-100 safe-pad-bottom">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-sm border border-gray-200 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]/20 transition-colors"
              data-testid="input-message"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
              className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
              data-testid="button-send-message"
            >
              <Send size={16} className="text-white ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 pb-24">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-xl flex items-center justify-center">
          <MessageCircle className="text-[#1e3a5f]" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900" data-testid="text-messages-title">Messages</h1>
          <p className="text-xs text-gray-400">
            {isCoachOrAdmin ? "Chat with your clients" : "Chat with your coach"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading conversations...</div>
      ) : conversations.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="text-[#1e3a5f]" size={28} />
          </div>
          <h3 className="font-bold text-gray-900 mb-1" data-testid="text-no-messages">No Conversations</h3>
          <p className="text-sm text-gray-400">
            {isCoachOrAdmin
              ? "Messages will appear when you start chatting with clients"
              : "Join a coach using an invite code to start messaging"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <button
              key={conv.partnerId}
              onClick={() => openChat(conv.partnerId, conv.partnerName)}
              className="w-full glass-card rounded-xl p-4 text-left transition-all active:scale-[0.98]"
              data-testid={`conversation-${conv.partnerId}`}
            >
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center">
                    <span className="text-[#1e3a5f] font-bold text-sm">
                      {conv.partnerName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#c41e3a] rounded-full flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold">{conv.unreadCount}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`font-semibold text-sm truncate ${conv.unreadCount > 0 ? "text-gray-900" : "text-gray-700"}`}>
                      {conv.partnerName}
                    </p>
                    <span className="text-[11px] text-gray-400 flex-shrink-0 ml-2 flex items-center gap-1">
                      <Clock size={10} />
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${conv.unreadCount > 0 ? "text-gray-600 font-medium" : "text-gray-400"}`}>
                    {conv.lastMessage}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isCoachOrAdmin && (
        <StartNewConversation userId={userId} onStartChat={openChat} existingPartners={conversations.map((c) => c.partnerId)} />
      )}
    </div>
  );
}

function StartNewConversation({
  userId,
  onStartChat,
  existingPartners,
}: {
  userId: string | null;
  onStartChat: (partnerId: string, partnerName: string) => void;
  existingPartners: string[];
}) {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    if (!userId || !showList) return;
    authFetch(`/api/coach/clients?coachId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        const mapped = data
          .filter((c: any) => !existingPartners.includes(c.id))
          .map((c: any) => ({
            id: c.id,
            name: c.name || c.firstName || c.username || "Client",
          }));
        setClients(mapped);
      })
      .catch(() => {});
  }, [userId, showList, existingPartners]);

  if (!showList) {
    return (
      <button
        onClick={() => setShowList(true)}
        className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-medium hover:border-[#1e3a5f] hover:text-[#1e3a5f] transition-colors"
        data-testid="button-new-conversation"
      >
        + Start New Conversation
      </button>
    );
  }

  return (
    <div className="mt-4 glass-card rounded-xl p-4">
      <h3 className="font-semibold text-gray-900 text-sm mb-3">Select a client to message</h3>
      {clients.length === 0 ? (
        <p className="text-xs text-gray-400">No clients available</p>
      ) : (
        <div className="space-y-2">
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onStartChat(c.id, c.name);
                setShowList(false);
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
              data-testid={`start-chat-${c.id}`}
            >
              <div className="w-8 h-8 bg-[#1e3a5f]/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-[#1e3a5f] font-bold text-xs">{c.name.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-sm text-gray-700 font-medium">{c.name}</span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setShowList(false)}
        className="mt-2 text-xs text-gray-400 hover:text-gray-600"
      >
        Cancel
      </button>
    </div>
  );
}
