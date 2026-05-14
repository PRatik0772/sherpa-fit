import { useState, useEffect, useRef } from "react";
import { useStore, authFetch } from "@/lib/store";
import { useLocation } from "wouter";
import { Send, Sparkles, Loader2, Bot, User, LogOut, Mountain } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "jung";
  content: string;
  structuredData?: any;
  createdAt: string;
};

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
        <Bot size={14} className="text-white" />
      </div>
      <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex items-end gap-2 mb-3", isUser ? "flex-row-reverse" : "")} data-testid={`message-${message.id}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
          <Bot size={14} className="text-white" />
        </div>
      )}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
          <User size={14} className="text-slate-600" />
        </div>
      )}
      <div className={cn(
        "max-w-[80%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
        isUser
          ? "bg-emerald-600 text-white rounded-2xl rounded-br-sm"
          : "bg-slate-100 text-slate-800 rounded-2xl rounded-bl-sm"
      )}>
        {message.content}
      </div>
    </div>
  );
}

function DraftSummaryCard({ summary }: { summary: any }) {
  if (!summary) return null;
  return (
    <div className="mx-2 my-3 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" data-testid="draft-summary-card">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-white/80" />
          <h3 className="text-sm font-bold text-white">Your Plan Preview</h3>
        </div>
      </div>
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-3 gap-1.5">
          {summary.calorie_target && (
            <div className="bg-emerald-50 rounded-xl p-2 text-center border border-emerald-100">
              <p className="text-lg font-bold text-emerald-600">{summary.calorie_target}</p>
              <p className="text-[9px] text-slate-400">kcal/day</p>
            </div>
          )}
          {summary.macros?.protein_g && (
            <div className="bg-violet-50 rounded-xl p-2 text-center border border-violet-100">
              <p className="text-lg font-bold text-violet-600">{summary.macros.protein_g}g</p>
              <p className="text-[9px] text-slate-400">protein</p>
            </div>
          )}
          {summary.macros?.carbs_g && (
            <div className="bg-amber-50 rounded-xl p-2 text-center border border-amber-100">
              <p className="text-lg font-bold text-amber-600">{summary.macros.carbs_g}g</p>
              <p className="text-[9px] text-slate-400">carbs</p>
            </div>
          )}
        </div>
        {summary.goal && (
          <p className="text-xs text-slate-500 text-center">{summary.goal}</p>
        )}
        {summary.activities && summary.activities.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center">
            {summary.activities.map((a: string, i: number) => (
              <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{a}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function JungCoach() {
  const store = useStore();
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [finalizeReady, setFinalizeReady] = useState(false);
  const [draftSummary, setDraftSummary] = useState<any>(null);
  const [finalizing, setFinalizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!store.userId) return;
    const loadSession = async () => {
      try {
        const res = await authFetch(`/api/jung/session/${store.userId}`);
        const data = await res.json();
        setSessionId(data.session.id);
        setMessages(data.messages || []);
        setFinalizeReady(data.session.finalizeReady || false);
        setDraftSummary(data.session.draftSummary || null);
      } catch (e) {
        console.error("Failed to load session:", e);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, [store.userId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    const tempMsg: ChatMessage = { id: `temp-${Date.now()}`, role: "user", content: text, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    try {
      const res = await authFetch("/api/jung/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: store.userId, message: text, sessionId }),
      });
      const data = await res.json();
      const jungMsg: ChatMessage = { id: `jung-${Date.now()}`, role: "jung", content: data.reply, structuredData: data, createdAt: new Date().toISOString() };
      setMessages(prev => [...prev, jungMsg]);
      if (data.finalizeReady) setFinalizeReady(true);
      if (data.draftSummary) setDraftSummary(data.draftSummary);
    } catch (e) {
      console.error("Chat error:", e);
    } finally {
      setSending(false);
    }
  };

  const handleFinalize = async () => {
    if (!sessionId || finalizing) return;
    setFinalizing(true);
    try {
      const res = await authFetch("/api/jung/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: store.userId, sessionId }),
      });
      const data = await res.json();
      if (data.planId) navigate(`/plan-creating/${data.planId}`);
    } catch (e) {
      console.error("Finalize error:", e);
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50" data-testid="jung-coach-screen">
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button onClick={() => { store.logout(); navigate("/"); }} className="text-slate-400 hover:text-slate-600 transition-colors" data-testid="btn-logout-jung">
            <LogOut size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
            </div>
            <div>
              <h1 className="text-slate-900 font-bold text-sm">Jung</h1>
              <p className="text-slate-400 text-[10px]">AI Coach</p>
            </div>
          </div>
        </div>
        <button onClick={handleFinalize} disabled={!finalizeReady || finalizing}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all",
            finalizeReady && !finalizing
              ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200"
              : "bg-slate-100 text-slate-300 cursor-not-allowed"
          )} data-testid="btn-finalize-plan">
          {finalizing ? (
            <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Creating...</span>
          ) : (
            <span className="flex items-center gap-1.5"><Sparkles size={12} /> Finalize Plan</span>
          )}
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4" data-testid="chat-messages">
        {messages.map(msg => (
          <div key={msg.id}>
            <MessageBubble message={msg} />
            {msg.role === "jung" && (msg.structuredData?.draft_summary || msg.structuredData?.draftSummary) && (
              <DraftSummaryCard summary={msg.structuredData.draft_summary || msg.structuredData.draftSummary} />
            )}
          </div>
        ))}
        {draftSummary && !messages.some(m => m.structuredData?.draft_summary || m.structuredData?.draftSummary) && (
          <DraftSummaryCard summary={draftSummary} />
        )}
        {sending && <TypingIndicator />}
      </div>

      <div className="px-4 py-3 bg-white border-t border-slate-100">
        <div className="flex items-center gap-2">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Tell Jung about your goals..."
            className="flex-1 bg-slate-50 rounded-xl px-4 py-2.5 text-sm outline-none border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            disabled={sending || finalizing} data-testid="input-chat-message" />
          <button onClick={sendMessage} disabled={!input.trim() || sending || finalizing}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              input.trim() && !sending
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                : "bg-slate-100 text-slate-300"
            )} data-testid="btn-send-message">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
