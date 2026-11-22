import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Mic, X, Send, Play } from 'lucide-react';
import { getDb } from '../services/dataClient';
import { ChatbotQA } from '../types';

interface AIChatbotProps {
  userEmail?: string;
  chatbotEnabled: boolean;
}

export default function AIChatbot({ userEmail, chatbotEnabled }: AIChatbotProps) {
  if (!chatbotEnabled) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string; time: string }[]>([
    {
      sender: 'bot',
      text: 'Greetings, Sir or Madam. I am the SunMedX AI Biomedical Assistant. How may I assist you with your equipment validation, calibration, or training questions today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [qaPairs, setQaPairs] = useState<ChatbotQA[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const db = getDb();
    const unsub = db.collection('chatbot_qa').onSnapshot((snap: any) => {
      const list: ChatbotQA[] = [];
      snap.forEach((doc: any) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setQaPairs(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const speakText = (text: string) => {
    try {
      if ('speechSynthesis' in window && window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(text);
        u.pitch = 0.95;
        u.rate = 0.95;
        window.speechSynthesis.speak(u);
      }
    } catch (err) {
      console.warn('[SpeechSynthesis Fallback] Speech synthesis failed or blocked:', err);
    }
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text, time };
    setMessages(prev => [...prev, userMsg]);
    setInputVal('');

    setTimeout(() => {
      const botResponseText = getBotResponse(text);
      const botMsg = {
        sender: 'bot' as const,
        text: botResponseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, botMsg]);
      speakText(botResponseText);
    }, 600);
  };

  const getBotResponse = (txt: string): string => {
    const clean = txt.toLowerCase().trim();
    if (clean.includes('hello') || clean.includes('hi') || clean.includes('hey')) {
      return 'Greetings, Sir or Madam. I am the SunMedX AI Biomedical Assistant. How can I assist you with critical hospital calibration checks or course certifications?';
    }

    let bestMatch: ChatbotQA | null = null;
    let highestScore = 0;

    for (const qa of qaPairs) {
      const qClean = qa.question.toLowerCase();
      const words = clean.split(/\s+/);
      let matchCount = 0;
      for (const w of words) {
        if (w.length > 2 && qClean.includes(w)) {
          matchCount++;
        }
      }
      if (qClean.includes(clean)) matchCount += 5;

      if (matchCount > highestScore) {
        highestScore = matchCount;
        bestMatch = qa;
      }
    }

    if (bestMatch && highestScore > 0) {
      return bestMatch.answer;
    }

    return 'I will connect you directly to our lead biomedical engineer, Sir or Madam. Please submit your equipment queries via our Contact page, or call +91 98765 43210 (Mumbai).';
  };

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Web Speech Voice Recognition is not supported on this browser.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.lang = 'en-IN';
    rec.interimResults = false;

    rec.onstart = () => setIsRecording(true);
    rec.onresult = (event: any) => {
      const voiceText = event.results[0][0].transcript;
      handleSendMessage(voiceText);
    };
    rec.onerror = (e: any) => {
      console.error(e);
      setIsRecording(false);
    };
    rec.onend = () => setIsRecording(false);

    rec.start();
  };

  return (
    <>
      <button
        id="btn-chatbot-trigger"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[990] bg-[#211D70] hover:bg-[#272F78] text-[#F8C72E] px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full font-syne font-bold text-xs flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all border-2 border-[#F8C72E]"
      >
        <MessageSquare className="w-4 h-4 shrink-0" />
        <span className="sm:hidden">AI Help</span>
        <span className="hidden sm:inline">Biomedical Assistant</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex justify-end bg-black/55 backdrop-blur-xs">
          <div className="w-full max-w-md h-full bg-white border-l border-[#D4D6E2] flex flex-col shadow-2xl">
            <div className="p-4 bg-[#211D70] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#F8C72E] flex items-center justify-center text-[#211D70] font-extrabold text-sm">
                  SX
                </div>
                <div>
                  <h3 className="font-syne font-bold text-white text-sm">SunMedX Advisor</h3>
                  <p className="text-xs text-[#F8C72E] font-mono">Biomedical Support Desk</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close assistant drawer"
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F7F8FC]">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[11px] text-[#505050] font-mono mb-1 px-1">
                    {m.sender === 'user' ? userEmail || 'Client' : 'SunMedX Advisor'} • {m.time}
                  </span>
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed shadow-xs ${
                      m.sender === 'user'
                        ? 'bg-[#211D70] text-white font-medium rounded-tr-none'
                        : 'bg-white border border-[#D4D6E2] text-[#404041] rounded-tl-none'
                    }`}
                  >
                    {m.text}
                    {m.sender === 'bot' && (
                      <button
                        onClick={() => speakText(m.text)}
                        title="Read out loud"
                        className="mt-2 text-xs font-bold text-[#211D70] hover:text-[#F26522] flex items-center gap-1.5"
                      >
                        <Play className="w-3 h-3 fill-current" /> Listen
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-[#D4D6E2] space-y-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ask about ISO calibrations, NABL guidelines, AMCs..."
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage(inputVal)}
                  className="flex-1 bg-white border border-[#D4D6E2] rounded-xl px-4 py-2.5 text-sm text-[#211D70] focus:outline-none focus:border-[#F26522] placeholder:text-[#505050]/60 font-sans"
                />

                <button
                  onClick={startVoiceInput}
                  title="Speak through mic"
                  aria-label="Voice input"
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors border ${
                    isRecording
                      ? 'bg-[#EA2227] border-[#EA2227] text-white'
                      : 'bg-[#F4F5FA] text-[#211D70] hover:bg-[#EAEAEA] border-[#D4D6E2]'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleSendMessage(inputVal)}
                  aria-label="Send message"
                  className="w-10 h-10 rounded-xl bg-[#F8C72E] hover:bg-[#211D70] hover:text-white flex items-center justify-center text-[#211D70] transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-center text-[#505050]">
                Responses sourced from verified biomedical support FAQ entries.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
