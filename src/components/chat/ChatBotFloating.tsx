import React, { useState, useEffect, useRef } from 'react';
import { X, Send, RotateCcw, AlertTriangle, FileText, Loader2, Globe, Upload, Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import ChatAvatar from './ChatAvatar';

const RAG_API = import.meta.env.VITE_RAG_API || 'https://smart-mes-rag.onrender.com';

interface SourceInfo {
  document: string;
  score: number;
  department?: string;
}

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  sources?: SourceInfo[];
  warnings?: string[];
  timing?: number;
  relatedQuestions?: string[];
  graphEntities?: string[];
  graphTiming?: number;
  isVisionResult?: boolean;
}

const PERSONA: Record<string, string> = {
  'zh-TW': 'Mei-Ling Chen (陳美玲)',
  'en': 'Alan Grant',
  'ja': 'Ayaka Sato (佐藤綾香)',
};

const WELCOME_MSG: Record<string, string[]> = {
  'zh-TW': [
    '我是陳美玲，您對哪些主題感興趣？',
    '我是陳美玲，元氣滿滿，開工開工！',
    '我是陳美玲，不要再想了，開始作就對了！',
  ],
  'en': [
    'Alan Grant here—let\'s accelerate your transition into the AI era.',
    'Alan Grant here - optimizing the backbone of your systems to make AI production-ready.',
    'I\'m Alan Grant; I specialize in engineering the performance infrastructure essential for the AI-driven era.',
  ],
  'ja': [
    '私は佐藤綾香です。静謐な姿で、優雅に万物を探求していきたいと思っています。',
    '私は佐藤綾香です。慌ただしい日常の中でも、常に落ち着きと優雅さを保っています。',
    '私は佐藤綾香です。時の流れを静かに待ちながら、静けさの中に優雅な力を醸し出しています。',
  ],
};

function randomWelcome(lang: string): string {
  const msgs = WELCOME_MSG[lang] || WELCOME_MSG['en'];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

function getPersona(lang: string): string {
  if (lang.startsWith('zh')) return PERSONA['zh-TW'];
  if (lang.startsWith('ja')) return PERSONA['ja'];
  return PERSONA['en'];
}

function getQueryLang(lang: string): string {
  if (lang.startsWith('zh')) return 'zh-TW';
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('vi')) return 'vi';
  return 'en';
}

function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const code = part.replace(/```(\w*)\n?/, '').replace(/```$/, '');
      return (
        <pre key={i} className="bg-base/50 rounded-lg p-3 my-2 overflow-x-auto text-sm font-mono text-text-primary">
          <code>{code}</code>
        </pre>
      );
    }
    const lines = part.split('\n');
    return (
      <React.Fragment key={i}>
        {lines.map((line, j) => {
          if (!line.trim()) return <br key={j} />;
          if (line.startsWith('### '))
            return <h3 key={j} className="text-base font-bold mt-3 mb-1 text-text-primary">{line.slice(4)}</h3>;
          if (line.startsWith('## '))
            return <h2 key={j} className="text-lg font-bold mt-4 mb-1 text-text-primary">{line.slice(3)}</h2>;
          if (line.startsWith('# '))
            return <h1 key={j} className="text-xl font-bold mt-4 mb-2 text-text-primary">{line.slice(2)}</h1>;
          const processed = line
            .replace(/\*\*\*(.+?)\*\*\*/g, '<em><strong>$1</strong></em>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code class="bg-base/50 px-1.5 py-0.5 rounded text-sm font-mono text-accent-green">$1</code>');
          return (
            <p key={j} className="mb-1.5 text-text-primary leading-relaxed" dangerouslySetInnerHTML={{ __html: processed }} />
          );
        })}
      </React.Fragment>
    );
  });
}

const LANG_OPTIONS = [
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'en',    label: 'English' },
  { code: 'ja',    label: '日本語' },
  { code: 'vi',    label: 'Tiếng Việt' },
] as const;

type LanguageCode = (typeof LANG_OPTIONS)[number]['code'];

const ChatBotFloating: React.FC = () => {
  const { i18n } = useTranslation();
  const { token, user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [shouldScale, setShouldScale] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>(() => {
    const l = i18n.language;
    if (l?.startsWith('zh')) return 'zh-TW';
    if (l?.startsWith('ja')) return 'ja';
    if (l?.startsWith('vi')) return 'vi';
    return 'en';
  });
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [graphEnabled, setGraphEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const persona = getPersona(i18n.language);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 150) + 'px';
    }
  }, [input]);

  useEffect(() => {
    const handler = (lng: string) => {
      if (lng?.startsWith('zh')) setLanguage('zh-TW');
      else if (lng?.startsWith('ja')) setLanguage('ja');
      else if (lng?.startsWith('vi')) setLanguage('vi');
      else setLanguage('en');
    };
    i18n.on('languageChanged', handler);
    return () => i18n.off('languageChanged', handler);
  }, [i18n]);

  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setShouldScale(true);
      setTimeout(() => setShouldScale(false), 1000);
      const welcome = randomWelcome(language);
      setMessages([{
        id: 'welcome',
        type: 'bot',
        content: welcome,
        timestamp: new Date(),
      }]);
    }
  }, [i18n.language, isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, type: 'user', content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const botId = `b-${Date.now()}`;
    setMessages(prev => [...prev, { id: botId, type: 'bot', content: '', timestamp: new Date() }]);

    try {
      const lang = getQueryLang(language);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const endpoint = graphEnabled ? `${RAG_API}/api/graphrag/graph/query` : `${RAG_API}/api/query`;
      const body = graphEnabled
        ? new URLSearchParams({ question: text, top_k: '5', language: lang })
        : JSON.stringify({ question: text, language: lang });
      const headers: Record<string, string> = graphEnabled
        ? { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
        : { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `Error ${res.status}` }));
        throw new Error(err.detail || 'Request failed');
      }

      const data = await res.json();
      setMessages(prev => prev.map(m =>
        m.id === botId ? {
          ...m,
          content: data.answer || 'No response',
          sources: data.sources,
          warnings: data.warnings,
          timing: data.timing,
          relatedQuestions: data.related_questions,
          graphEntities: data.graph_entities,
          graphTiming: data.graph_timing,
        } : m
      ));
    } catch (err) {
      const msg = err instanceof Error
        ? (err.name === 'AbortError' ? '伺服器無回應，請稍後再試 (timeout 90s)' : err.message)
        : 'Connection failed';
      setMessages(prev => prev.map(m =>
        m.id === botId ? { ...m, content: `Error: ${msg}` } : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setMessages(prev => [...prev, {
        id: `vision-${Date.now()}`,
        type: 'bot',
        content: 'Please upload a PDF file.',
        timestamp: new Date(),
        isVisionResult: true,
      }]);
      return;
    }

    setIsLoading(true);
    setIsAnalyzing(true);
    const botId = `v-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: botId,
      type: 'bot',
      content: `📤 **Uploading PDF:** ${file.name}\n\n⏳ *Vision analysis started in background...*`,
      timestamp: new Date(),
      isVisionResult: true,
    }]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('max_pages', '20');
      formData.append('department', '');
      formData.append('add_to_kb', 'true');

      const res = await fetch(`${RAG_API}/api/graphrag/vision/analyze`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error(`Vision upload failed: ${res.status}`);

      const data = await res.json();

      // Async mode: poll for results
      if (data.status === 'processing' && data.poll_url) {
        const pollInterval = 3000;
        const maxPolls = 60; // 3 minutes max
        let polls = 0;

        // Show initial processing status
        setMessages(prev => prev.map(m =>
          m.id === botId ? { ...m, content: `📤 **PDF Uploaded:** ${file.name}\n\n🔍 *Analyzing pages... (0/${maxPolls * 3}s)*` } : m
        ));

        const poll = async (): Promise<boolean> => {
          while (polls < maxPolls) {
            await new Promise(r => setTimeout(r, pollInterval));
            polls++;
            const elapsed = polls * 3;
            // Update progress every poll
            setMessages(prev => prev.map(m =>
              m.id === botId ? { ...m, content: `📤 **PDF Uploaded:** ${file.name}\n\n🔍 *Analyzing pages... (${elapsed}s elapsed)*` } : m
            ));
            try {
              const pollRes = await fetch(`${RAG_API}${data.poll_url}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (!pollRes.ok) continue;
              const result = await pollRes.json();
              if (result.status === 'ok') {
                // Build analysis text
                let analysisText = `**PDF Analysis: ${file.name}**\n\n`;
                if (result.results) {
                  result.results.forEach((page: any, idx: number) => {
                    analysisText += `**Page ${page.page || idx + 1}:**\n`;
                    if (page.text) analysisText += `${page.text}\n`;
                    if (page.vision_result) analysisText += `\n*Vision:* ${page.vision_result}\n`;
                    analysisText += '\n';
                  });
                }
                analysisText += `---\n*Total pages analyzed: ${result.total_pages || 0}*`;
                if (result.saved_to) {
                  analysisText += `\n*File saved to knowledge base.*`;
                }
                analysisText += `\n\n✅ **Knowledge base ready. You can now ask questions about this document.**`;

                setMessages(prev => prev.map(m =>
                  m.id === botId ? { ...m, content: analysisText, isVisionResult: true } : m
                ));
                return true;
              } else if (result.status === 'error') {
                throw new Error(result.message || 'Vision analysis failed');
              }
              // status === 'processing' → continue polling
            } catch {
              // network error, keep polling
            }
          }
          return false;
        };

        const done = await poll();
        if (!done) {
          setMessages(prev => prev.map(m =>
            m.id === botId ? { ...m, content: `**PDF Analysis: ${file.name}**\n\n⚠️ Vision analysis is taking longer than expected. Please try again later.` } : m
          ));
        }
        setIsAnalyzing(false);
      } else {
        // Sync fallback (shouldn't happen with new backend)
        let analysisText = `**PDF Analysis: ${file.name}**\n\n`;
        if (data.results) {
          data.results.forEach((page: any, idx: number) => {
            analysisText += `**Page ${idx + 1}:** ${page.text || 'No text extracted'}\n\n`;
          });
        }
        setMessages(prev => prev.map(m =>
          m.id === botId ? { ...m, content: analysisText, isVisionResult: true } : m
        ));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Vision analysis failed';
      setMessages(prev => prev.map(m =>
        m.id === botId ? { ...m, content: `Error: ${msg}` } : m
      ));
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleReset = () => {
    const welcome = randomWelcome(language);
    setMessages([{
      id: 'welcome',
      type: 'bot',
      content: welcome,
      timestamp: new Date(),
    }]);
    setIsLoading(false);
  };

  const handleFirstPlay = () => { setAudioUnlocked(true); setIsMuted(false); };
  const handleToggleMute = () => setIsMuted(!isMuted);
  const handleVideoEnded = () => setIsMuted(true);

  if (!user) return null;

  if (!isOpen) {
    return (
      <div
        onClick={() => { if (!audioUnlocked) { setAudioUnlocked(true); setIsMuted(false); } setIsOpen(true); }}
        onMouseEnter={() => { setShouldScale(true); if (audioUnlocked) setIsMuted(false); }}
        onMouseLeave={() => { setShouldScale(false); setIsMuted(true); }}
        className="fixed bottom-6 right-6 z-40 group active:scale-95 transition-transform opacity-60 hover:opacity-100 cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(true); } }}
        aria-label="Open AI Assistant"
      >
        <div className="relative w-20 h-20">
          <ChatAvatar
            size="lg"
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            audioUnlocked={audioUnlocked}
            onFirstPlay={handleFirstPlay}
            shouldScale={shouldScale}
            onVideoEnded={handleVideoEnded}
          />
          <div className="absolute -inset-2 bg-gradient-to-r from-accent-blue/30 to-accent-purple/30 rounded-full blur-md animate-pulse" />
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2 bg-surface border border-white/10 text-text-primary px-3 py-1.5 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity text-center whitespace-nowrap pointer-events-none shadow-xl">
          <div>{persona}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 max-h-[80vh] md:bottom-6 md:right-6 md:left-auto md:w-96 md:h-[600px] bg-surface rounded-2xl shadow-2xl flex flex-col z-50 border border-white/10">
      {/* Header */}
      <div className="bg-gradient-to-r from-accent-blue to-accent-purple text-white p-3 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            onMouseEnter={() => { if (audioUnlocked) setIsMuted(false); }}
            onMouseLeave={() => setIsMuted(true)}
          >
            <ChatAvatar
              size="sm"
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              audioUnlocked={audioUnlocked}
              onFirstPlay={handleFirstPlay}
              shouldScale={shouldScale}
              onVideoEnded={handleVideoEnded}
            />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{persona}</h3>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* GraphRAG Toggle */}
          <button
            onClick={() => setGraphEnabled(!graphEnabled)}
            className={`p-1.5 rounded-full transition-colors ${graphEnabled ? 'bg-white/30' : 'hover:bg-white/20'}`}
            title={graphEnabled ? 'GraphRAG enabled' : 'Enable GraphRAG'}
          >
            <Network className="w-4 h-4" />
          </button>
          {/* File Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
            title="Upload PDF for analysis"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
              title="Language"
            >
              <Globe className="w-4 h-4" />
            </button>
            {showLangMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowLangMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-surface border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[130px]">
                  {LANG_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      onClick={() => { setLanguage(opt.code); setShowLangMenu(false); i18n.changeLanguage(opt.code); }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        language === opt.code
                          ? 'text-accent-blue bg-accent-blue/10'
                          : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={handleReset} className="p-1.5 rounded-full hover:bg-white/20 transition-colors" title="Reset">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* GraphRAG status bar */}
      {graphEnabled && (
        <div className="bg-accent-purple/10 border-b border-accent-purple/20 px-3 py-1 text-[10px] text-accent-purple flex items-center gap-1">
          <Network size={10} />
          GraphRAG enhanced mode — queries include knowledge graph context
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-base">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <div className="w-16 h-16 mb-3 opacity-30">
              <ChatAvatar size="lg" isMuted={true} audioUnlocked={false} onFirstPlay={()=>{}} onToggleMute={()=>{}} shouldScale={false} onVideoEnded={()=>{}} />
            </div>
            <p className="text-sm">Ask a question to get started</p>
            <p className="text-xs mt-1 opacity-60">Press Enter to send, Shift+Enter for new line</p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.type === 'bot' ? (
              <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border-2 border-accent-blue/30">
                <ChatAvatar
                  size="sm"
                  isMuted={true}
                  audioUnlocked={false}
                  onFirstPlay={()=>{}}
                  onToggleMute={()=>{}}
                  shouldScale={false}
                  onVideoEnded={()=>{}}
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-accent-purple" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.type === 'user'
                ? 'bg-accent-blue/10 border border-accent-blue/20 rounded-tr-sm text-text-primary'
                : msg.content
                  ? 'bg-surface border border-white/10 rounded-tl-sm text-text-primary'
                  : 'bg-surface border border-white/10 rounded-tl-sm'
            }`}>
              {msg.warnings && msg.warnings.length > 0 && (
                <div className="flex items-start gap-1.5 mb-2 text-xs text-warning">
                  <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                  <div>
                    {msg.warnings.map((w, i) => <p key={i}>{w}</p>)}
                  </div>
                </div>
              )}

              {msg.type === 'bot' && !msg.content ? (
                <div className="flex gap-1 py-1">
                  <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : msg.type === 'bot' ? (
                <div className="text-sm">{renderMarkdown(msg.content)}</div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}

              {/* Graph entities */}
              {msg.graphEntities && msg.graphEntities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/5">
                  {msg.graphEntities.map((entity, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
                      <Network size={10} />
                      {entity}
                    </span>
                  ))}
                  {msg.graphTiming !== undefined && (
                    <span className="text-[10px] text-text-muted ml-1 self-center">graph: {msg.graphTiming.toFixed(2)}s</span>
                  )}
                </div>
              )}

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-white/5">
                  {msg.sources.map((src, i) => (
                    <span
                      key={i}
                      title={`Score: ${(src.score * 100).toFixed(1)}%`}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue border border-accent-blue/20"
                    >
                      <FileText size={10} />
                      {src.document.split('/').pop() || src.document}
                      {src.department && <span className="opacity-60 ml-0.5">· {src.department}</span>}
                    </span>
                  ))}
                </div>
              )}

              {msg.timing !== undefined && (
                <p className="text-[10px] text-text-muted mt-1.5 opacity-50">{(msg.timing).toFixed(1)}s</p>
              )}

              {msg.relatedQuestions && msg.relatedQuestions.length > 0 && (
                <div className="mt-3 pt-2 border-t border-white/5">
                  <p className="text-[10px] text-text-muted mb-1.5 font-medium">相關問題：</p>
                  <div className="flex flex-col gap-1">
                    {msg.relatedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(q)}
                        className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-accent-blue/10 text-text-muted hover:text-accent-blue border border-white/5 hover:border-accent-blue/20 transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-3 bg-surface">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAnalyzing ? 'Analyzing PDF, please wait...' : 'Ask a question...'}
            rows={1}
            disabled={isLoading || isAnalyzing}
            className="flex-1 bg-base rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder-text-muted/50 border border-white/10 focus:outline-none focus:border-accent-blue/40 resize-none disabled:opacity-50 transition-colors"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading || isAnalyzing}
            className="p-2.5 rounded-xl bg-accent-blue text-white hover:bg-accent-blue/90 disabled:bg-white/5 disabled:text-text-muted disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBotFloating;
