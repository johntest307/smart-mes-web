
import { useState, lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DashboardProvider } from './hooks/DashboardContext';
import { useVoiceIntro } from './hooks/useVoiceIntro';
import Navbar from './components/layout/Navbar';
import SplashScreen from './components/splash/SplashScreen';
import './i18n';

const Home = lazy(() => import('./pages/Home'));
const VideoPage = lazy(() => import('./pages/VideoPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MonitorPage = lazy(() => import('./pages/MonitorPage'));
const YieldAnalysisPage = lazy(() => import('./pages/YieldAnalysisPage'));
const GuidePage = lazy(() => import('./pages/GuidePage'));
const CostEstimationPage = lazy(() => import('./pages/CostEstimationPage'));
const OldLinePage = lazy(() => import('./pages/OldLinePage'));
const OldOrgPage = lazy(() => import('./pages/OldOrgPage'));
const OldPcPage = lazy(() => import('./pages/OldPcPage'));
const OldMvaPage = lazy(() => import('./pages/OldMvaPage'));
const TempHumidityPage = lazy(() => import('./pages/TempHumidityPage'));
const OldSecurityPage = lazy(() => import('./pages/OldSecurityPage'));
const OldQrCodePage = lazy(() => import('./pages/OldQrCodePage'));
const OldMpiPage = lazy(() => import('./pages/OldMpiPage'));
const OldMsformsPage = lazy(() => import('./pages/OldMsformsPage'));
const OldRepairRatePage = lazy(() => import('./pages/OldRepairRatePage'));
const OldQualityTrackingPage = lazy(() => import('./pages/OldQualityTrackingPage'));
const OldBapmPage = lazy(() => import('./pages/OldBapmPage'));
const ChatBotFloatingLazy = lazy(() => import('./components/chat/ChatBotFloating'));

function DashboardLayout() {
  return (
    <DashboardProvider>
      <Outlet />
    </DashboardProvider>
  );
}

function VoiceInit() {
  useVoiceIntro();
  return null;
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(() => !localStorage.getItem('splashSeen'));

  if (showSplash) {
    return <SplashScreen onFinish={() => { localStorage.setItem('splashSeen', '1'); setShowSplash(false); }} />;
  }

  return (
    <BrowserRouter>
      <VoiceInit />
      <div className="flex flex-col min-h-screen bg-base text-text-primary">
        <Navbar />
        <main className="flex-grow">
          <Suspense fallback={<div className="flex items-center justify-center h-64 text-text-muted">載入中…</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/video" element={<VideoPage />} />
              <Route path="/guide" element={<GuidePage />} />
              <Route path="/line" element={<OldLinePage />} />
              <Route path="/org" element={<OldOrgPage />} />
              <Route path="/pc" element={<OldPcPage />} />
              <Route path="/mva" element={<OldMvaPage />} />
              <Route path="/temp-humidity" element={<TempHumidityPage />} />
              <Route path="/security" element={<OldSecurityPage />} />
              <Route path="/qrcode" element={<OldQrCodePage />} />
              <Route path="/mpi" element={<OldMpiPage />} />
              <Route path="/msforms" element={<OldMsformsPage />} />
              <Route path="/repair-rate" element={<OldRepairRatePage />} />
              <Route path="/quality-tracking" element={<OldQualityTrackingPage />} />
              <Route path="/bapm" element={<OldBapmPage />} />
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/monitor" element={<MonitorPage />} />
                <Route path="/yield" element={<YieldAnalysisPage />} />
                <Route path="/cost" element={<CostEstimationPage />} />
              </Route>
            </Routes>
          </Suspense>
        </main>
        <Suspense fallback={null}>
          <ChatBotFloatingLazy />
        </Suspense>
      </div>
    </BrowserRouter>
  );
}

function App() {
  useEffect(() => {
    const RAG_API = import.meta.env.VITE_RAG_API || 'https://smart-mes-rag.onrender.com';
    const ping = () => fetch(`${RAG_API}/health`, { method: 'GET', mode: 'cors' }).catch(() => {});
    ping();
    const id = setInterval(ping, 600000);
    return () => clearInterval(id);
  }, []);

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
