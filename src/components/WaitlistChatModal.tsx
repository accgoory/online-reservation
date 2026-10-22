import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  Sparkles, 
  Clock, 
  Users, 
  Crown, 
  Check, 
  CheckCheck,
  ChevronRight,
  Smile,
  ShieldCheck,
  Volume2
} from 'lucide-react';
import { 
  WaitlistChatMessage, 
  ChatSenderRole, 
  WaitlistEntry 
} from '../types/restaurant';
import { 
  subscribeToWaitlistChat, 
  sendWaitlistMessage, 
  markWaitlistMessagesAsRead,
  STAFF_QUICK_TEMPLATES,
  GUEST_QUICK_TEMPLATES
} from '../services/waitlistChatService';
import { playChime } from '../utils/audio';

interface WaitlistChatModalProps {
  waitlistEntry: WaitlistEntry;
  currentUserRole: ChatSenderRole; // 'staff' | 'customer'
  currentUserName?: string;
  onClose: () => void;
}

export const WaitlistChatModal: React.FC<WaitlistChatModalProps> = ({
  waitlistEntry,
  currentUserRole,
  currentUserName,
  onClose
}) => {
  const [messages, setMessages] = useState<WaitlistChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const senderName = currentUserName || (currentUserRole === 'staff' ? 'Host Goory Coffee & Eatery' : waitlistEntry.customerName);
  const quickTemplates = currentUserRole === 'staff' ? STAFF_QUICK_TEMPLATES : GUEST_QUICK_TEMPLATES;

  // Auto scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Subscribe to real-time chat messages
  useEffect(() => {
    const unsubscribe = subscribeToWaitlistChat(waitlistEntry.id, (incomingMessages) => {
      setMessages(incomingMessages);
      // Mark messages from opposite role as read
      markWaitlistMessagesAsRead(waitlistEntry.id, currentUserRole);
      setTimeout(() => scrollToBottom('smooth'), 100);
    });

    // Mark as read upon opening
    markWaitlistMessagesAsRead(waitlistEntry.id, currentUserRole);

    return () => {
      unsubscribe();
    };
  }, [waitlistEntry.id, currentUserRole]);

  // Initial scroll
  useEffect(() => {
    scrollToBottom('auto');
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async (textToSend?: string, templateId?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText('');

    try {
      await sendWaitlistMessage({
        waitlistEntryId: waitlistEntry.id,
        queueCode: waitlistEntry.queueCode,
        senderRole: currentUserRole,
        senderName,
        text,
        quickTemplateId: templateId
      });
    } catch (err) {
      console.error('Failed to send waitlist chat message:', err);
    } finally {
      setIsSending(false);
      setTimeout(() => {
        scrollToBottom('smooth');
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isStaff = currentUserRole === 'staff';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-stone-900 border-t sm:border border-amber-900/50 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[85vh] sm:h-[680px] overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-stone-950 absolute -bottom-0.5 -right-0.5 animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-sm sm:text-base text-stone-100">
                  {isStaff ? waitlistEntry.customerName : 'Host & Tim Layanan Goory Coffee & Eatery'}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-[10px]">
                  #{waitlistEntry.queueNumber} {waitlistEntry.queueCode}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5">
                <span>{waitlistEntry.guestCount} Tamu • Area {waitlistEntry.preferredSection}</span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">Aktif Terhubung</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => playChime('ding')}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 transition-colors cursor-pointer"
              title="Uji Bunyi Suara Notifikasi"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Guest VIP or Special Requests Info Banner */}
        {waitlistEntry.specialRequests && (
          <div className="px-4 py-2 bg-stone-950/80 border-b border-stone-800/60 text-xs text-amber-300 flex items-center justify-between shrink-0">
            <span className="truncate">
              💡 Catatan Tamu: &ldquo;{waitlistEntry.specialRequests}&rdquo;
            </span>
            {waitlistEntry.loyaltyTier && (
              <span className="shrink-0 text-[10px] font-mono font-bold text-amber-400 ml-2">
                VIP {waitlistEntry.loyaltyTier}
              </span>
            )}
          </div>
        )}

        {/* Chat Message Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-gradient-to-b from-stone-950/60 via-stone-900 to-stone-950/90">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-stone-800/50 border border-stone-800 flex items-center justify-center text-amber-400/60">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium text-stone-300">
                {isStaff 
                  ? `Mulai percakapan langsung dengan ${waitlistEntry.customerName}.` 
                  : 'Hubungi tim restoran kami untuk permintaan khusus atau estimasi waktu.'}
              </p>
              <p className="text-[11px] text-stone-500 max-w-xs">
                Pesan akan tersinkronisasi langsung secara real-time ke sistem kasir dan kru restoran.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderRole === currentUserRole;
              const formattedTime = new Date(msg.createdAt).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-1 animate-in fade-in-50 duration-150`}
                >
                  <span className="text-[10px] font-mono text-stone-400 px-1">
                    {msg.senderName} • {formattedTime} WIB
                  </span>

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-md ${
                      isMine
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-medium rounded-tr-xs'
                        : 'bg-stone-800 text-stone-100 border border-stone-700/80 rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>

                  <div className="flex items-center gap-1 text-[9px] text-stone-400 px-1">
                    {isMine && (
                      msg.isRead ? (
                        <span className="flex items-center gap-0.5 text-amber-400 font-mono">
                          <CheckCheck className="w-3 h-3" /> Dibaca
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-stone-400 font-mono">
                          <Check className="w-3 h-3" /> Terkirim
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Predefined Quick Template Buttons */}
        <div className="px-4 py-2 bg-stone-950/90 border-t border-stone-800/80 shrink-0">
          <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1.5">
            <span className="font-medium text-stone-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {isStaff ? 'Template Respon Cepat Staf:' : 'Pesan Cepat Tamu:'}
            </span>
            <span className="text-[10px] text-stone-400">Klik untuk langsung kirim</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {quickTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleSendMessage(template.message, template.id)}
                className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-800 text-[11px] whitespace-nowrap transition-colors cursor-pointer shrink-0"
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Input Box */}
        <div className="p-3 sm:p-4 bg-stone-950 border-t border-stone-800 shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isStaff 
                  ? 'Ketik pesan balasan untuk tamu...' 
                  : 'Ketik pesan atau permintaan khusus di sini...'
              }
              className="flex-1 bg-stone-900 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-stone-100 placeholder-stone-500 focus:outline-hidden transition-colors"
            />

            <button
              type="button"
              disabled={!inputText.trim() || isSending}
              onClick={() => handleSendMessage()}
              className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md shadow-amber-600/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Kirim</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
