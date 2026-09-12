import { useState } from 'react';
import { Navigate } from 'react-router-dom';
// import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { Bot, Loader2 } from 'lucide-react';

const AUTH_API = import.meta.env.VITE_RAG_API || 'https://smart-mes-rag.onrender.com';

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const [error, setError] = useState('');

  // Google auth commented out — uses mock credential
  const handleBypassLogin = async () => {
    setError('');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(`${AUTH_API}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: 'bypass-mock-token' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      login(data.token, { email: data.email, name: data.name });
      window.location.href = '/';
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setError(msg);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-text-muted" />
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-surface rounded-2xl border border-white/10 p-8 relative">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-accent-blue/20 flex items-center justify-center mx-auto mb-4">
            <Bot size={32} className="text-accent-blue" />
          </div>
          <h1 className="text-xl font-bold text-text-primary">請登入</h1>
          <p className="text-sm text-text-muted mt-1">存取系統</p>
        </div>

        <div className="flex justify-center">
          <button onClick={handleBypassLogin}
            className="px-6 py-3 rounded-full bg-accent-blue hover:bg-accent-blue/80 text-white font-semibold transition-colors">
            直接進入
          </button>
        </div>

        {error && (
          <div className="mt-4 text-xs text-red-400 bg-red-400/10 rounded-lg p-2 text-center">{error}</div>
        )}
      </div>
    </div>
  );
}