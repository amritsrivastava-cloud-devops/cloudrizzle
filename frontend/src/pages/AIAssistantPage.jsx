import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Trash2, Plus, Zap, Code, DollarSign, Shield, Loader } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import api from '../utils/api';
import { useUIStore, useCloudStore } from '../store';

const QUICK_PROMPTS = [
  { icon: <Zap size={13} />, text: 'Generate EC2 Terraform for a web app' },
  { icon: <DollarSign size={13} />, text: 'Analyze my infrastructure costs and suggest savings' },
  { icon: <Code size={13} />, text: 'Create an ECS Fargate task definition' },
  { icon: <Shield size={13} />, text: 'Review my security group rules for best practices' },
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className="animate-slide-up" style={{
      display: 'flex',
      gap: 12,
      padding: '12px 0',
      flexDirection: isUser ? 'row-reverse' : 'row'
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: isUser
          ? 'linear-gradient(135deg, var(--brand-primary), var(--neon-purple))'
          : 'linear-gradient(135deg, var(--neon-teal), var(--brand-primary))',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {isUser ? <User size={14} color="#fff" /> : <Bot size={14} color="#fff" />}
      </div>

      <div style={{
        maxWidth: '78%',
        background: isUser ? 'var(--brand-primary)' : 'var(--bg-elevated)',
        border: isUser ? 'none' : '1px solid var(--border-dim)',
        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
        padding: '12px 16px',
        color: isUser ? '#fff' : 'var(--text-primary)',
        fontSize: 13,
        lineHeight: 1.6
      }}>
        {isUser ? (
          <p style={{ margin: 0 }}>{msg.content}</p>
        ) : (
          <div style={{ fontFamily: 'inherit' }}>
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{ borderRadius: 8, fontSize: 12, margin: '8px 0' }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code style={{
                      background: 'rgba(79,142,255,0.15)', padding: '2px 6px',
                      borderRadius: 4, fontSize: 12, fontFamily: 'var(--font-mono)',
                      color: 'var(--brand-primary)'
                    }} {...props}>
                      {children}
                    </code>
                  );
                },
                p: ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
                ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: '8px 0' }}>{children}</ul>,
                ol: ({ children }) => <ol style={{ paddingLeft: 20, margin: '8px 0' }}>{children}</ol>,
                h1: ({ children }) => <h1 style={{ fontSize: 16, fontFamily: 'var(--font-display)', marginBottom: 8, color: 'var(--brand-primary)' }}>{children}</h1>,
                h2: ({ children }) => <h2 style={{ fontSize: 14, fontFamily: 'var(--font-display)', marginBottom: 6, color: 'var(--text-primary)' }}>{children}</h2>,
                h3: ({ children }) => <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{children}</h3>,
                strong: ({ children }) => <strong style={{ color: 'var(--brand-accent)' }}>{children}</strong>,
              }}
            >
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIAssistantPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const { addNotification } = useUIStore();
  const { accounts } = useCloudStore();

  useEffect(() => {
    loadConversations();
    // Welcome message
    setMessages([{
      role: 'assistant',
      content: `# Welcome to CloudRizzle AI! 🚀

I'm your intelligent infrastructure assistant. I can help you:

- **Generate Terraform code** for any cloud resource
- **Design architectures** for AWS, Azure, and GCP
- **Optimize costs** and identify savings opportunities
- **Troubleshoot** infrastructure issues and analyze logs
- **Security reviews** and compliance guidance

What would you like to build today?`
    }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadConversations = async () => {
    try {
      const { data } = await api.get('/ai/conversations');
      setConversations(data.conversations || []);
    } catch (_) {}
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data } = await api.post('/ai/chat', {
        message: msg,
        conversationId,
        context: { cloudAccounts: accounts.map(a => ({ name: a.name, provider: a.provider })) }
      });
      setConversationId(data.conversationId);
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      loadConversations();
    } catch (err) {
      addNotification({ type: 'error', title: 'AI Error', message: 'Failed to get response. Please try again.' });
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please check your API key configuration and try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const newConversation = () => {
    setConversationId(null);
    setMessages([{
      role: 'assistant',
      content: 'New conversation started. How can I help you with your infrastructure today?'
    }]);
  };

  const loadConversation = async (id) => {
    try {
      const { data } = await api.get(`/ai/conversations/${id}`);
      setConversationId(id);
      setMessages(data.conversation.messages);
      setShowHistory(false);
    } catch (_) {}
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      {/* Sidebar - conversation history */}
      <div style={{
        width: showHistory ? 260 : 0,
        minWidth: showHistory ? 260 : 0,
        background: 'var(--bg-deep)',
        borderRight: '1px solid var(--border-dim)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border-dim)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>History</h3>
          <button onClick={newConversation} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
            <Plus size={13} /> New Chat
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
          {conversations.map(c => (
            <button key={c.id} onClick={() => loadConversation(c.id)} style={{
              display: 'block', width: '100%', padding: '10px 12px',
              background: c.id === conversationId ? 'var(--bg-hover)' : 'transparent',
              border: `1px solid ${c.id === conversationId ? 'var(--border-active)' : 'transparent'}`,
              borderRadius: 8, cursor: 'pointer', textAlign: 'left', marginBottom: 4
            }}>
              <div style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{c.messageCount} messages</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-dim)',
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--bg-deep)'
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--neon-teal), var(--brand-primary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Bot size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>CloudRizzle AI</div>
            <div style={{ fontSize: 11, color: 'var(--brand-accent)', fontFamily: 'var(--font-mono)' }}>Powered by Claude · Infrastructure Expert</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={() => setShowHistory(s => !s)} className="btn btn-secondary" style={{ fontSize: 11 }}>History</button>
            <button onClick={newConversation} className="btn btn-ghost" style={{ fontSize: 11 }}><Plus size={13} /> New</button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {messages.map((msg, i) => <Message key={i} msg={msg} />)}
          {loading && (
            <div style={{ display: 'flex', gap: 12, padding: '12px 0', alignItems: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--neon-teal), var(--brand-primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={14} color="#fff" />
              </div>
              <div style={{ display: 'flex', gap: 4, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: '4px 16px 16px 16px', border: '1px solid var(--border-dim)' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-accent)', animation: 'pulse-glow 1.2s infinite', animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {QUICK_PROMPTS.map((qp, i) => (
              <button key={i} onClick={() => sendMessage(qp.text)} className="btn btn-secondary" style={{ fontSize: 11, gap: 6 }}>
                {qp.icon} {qp.text}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-dim)',
          background: 'var(--bg-deep)'
        }}>
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-end',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: '10px 12px',
            transition: 'border-color 0.15s ease'
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your infrastructure... (Enter to send, Shift+Enter for new line)"
              disabled={loading}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                fontSize: 13, resize: 'none', minHeight: 20, maxHeight: 120,
                lineHeight: 1.5
              }}
              rows={1}
              onInput={e => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="btn btn-primary"
              style={{ padding: '8px 12px', borderRadius: 8, flexShrink: 0 }}
            >
              {loading ? <Loader size={14} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <Send size={14} />}
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            CloudRizzle AI may generate infrastructure code. Always review before applying to production.
          </div>
        </div>
      </div>
    </div>
  );
}
