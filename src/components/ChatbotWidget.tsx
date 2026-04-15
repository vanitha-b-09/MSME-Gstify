import { useState } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
}

const quickResponses: Record<string, string> = {
  "low confidence": "You have 2 invoices with low confidence scores:\n• INV-2024-004 (45%) — Missing GSTIN\n• INV-2024-002 (72%) — Invalid GSTIN format",
  "gst due": "GSTR-3B filing is due in 5 days. You have 5 GST-ready invoices and 3 pending review.",
  "pending": "You have 2 pending invoices:\n• INV-2024-003 (₹12,600)\n• PT-2024-102 (₹10,030)",
  "duplicate": "1 potential duplicate detected: PT-2024-101 appears twice for Steel Corp India.",
};

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, text: "Hi! I'm your AI assistant. Ask me about invoices, GST deadlines, or compliance status.", sender: "bot" },
  ]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now(), text: input, sender: "user" };
    setMessages((m) => [...m, userMsg]);

    const lower = input.toLowerCase();
    const match = Object.entries(quickResponses).find(([key]) => lower.includes(key));
    const botReply = match ? match[1] : "I can help with invoice queries, GST deadlines, and compliance checks. Try asking about 'low confidence invoices' or 'pending invoices'.";

    setTimeout(() => {
      setMessages((m) => [...m, { id: Date.now() + 1, text: botReply, sender: "bot" }]);
    }, 600);
    setInput("");
  };

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full gradient-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform flex items-center justify-center z-50"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col z-50 animate-scale-in overflow-hidden">
          {/* Header */}
          <div className="gradient-primary p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary-foreground">
              <Bot className="w-5 h-5" />
              <span className="font-semibold text-sm">AI Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-primary-foreground/80 hover:text-primary-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-2 ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                {m.sender === "bot" && <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><Bot className="w-3.5 h-3.5 text-primary" /></div>}
                <div className={`max-w-[75%] rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-line ${m.sender === "user" ? "gradient-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.text}
                </div>
                {m.sender === "user" && <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><User className="w-3.5 h-3.5 text-primary" /></div>}
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-2 flex gap-2 overflow-x-auto">
            {["Low confidence", "GST due", "Pending", "Duplicate"].map((q) => (
              <button key={q} onClick={() => { setInput(q); }} className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors whitespace-nowrap">
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border flex gap-2">
            <Input placeholder="Ask anything..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} className="text-sm" />
            <Button size="icon" onClick={handleSend} className="gradient-primary text-primary-foreground flex-shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
