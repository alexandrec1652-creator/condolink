
import React, { useState, useEffect, useRef } from 'react';
import { Parcel, ParcelStatus, ViewMode, User, Notice } from './types';
import { generateNotificationMessage } from './services/geminiService';
import { dbService } from './services/dbService';
import { notificationService } from './services/notificationService';
import StaffDashboard from './components/StaffDashboard';
import ResidentDashboard from './components/ResidentDashboard';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import Navbar from './components/Navbar';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('WELCOME');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [db, setDb] = useState(dbService.getState());
  const [loading, setLoading] = useState(false);
  
  // Use a ref to track previous notice count for notification logic
  const prevNoticesRef = useRef<Notice[]>(db.notices);

  useEffect(() => {
    // Sincronizar estado inicial e recuperar sessão
    const savedUser = localStorage.getItem('condo_current_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setViewMode(user.role);
        // Request notification permissions after session recovery
        notificationService.requestPermission();
      } catch (e) {
        localStorage.removeItem('condo_current_user');
      }
    }

    // Listener para atualizações em tempo real entre abas
    const unsubscribe = dbService.onUpdate((newState) => {
      // Logic for system notifications when a new notice arrives
      if (newState.notices.length > prevNoticesRef.current.length) {
        const latestNotice = newState.notices[0];
        // Only notify if the app is in the background or another user created it
        // and if it's not the user who created it (for the sake of logic)
        if (latestNotice.id !== prevNoticesRef.current[0]?.id) {
          notificationService.show(
            `📢 Novo Comunicado: ${latestNotice.title}`,
            latestNotice.content
          );
        }
      }
      
      prevNoticesRef.current = newState.notices;
      setDb(newState);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('condo_current_user', JSON.stringify(user));
    setViewMode(user.role);
    notificationService.requestPermission();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('condo_current_user');
    setViewMode('WELCOME');
  };

  const handleAddParcel = async (data: any) => {
    setLoading(true);
    try {
      const parcel: Parcel = {
        ...data,
        id: crypto.randomUUID(),
        receivedAt: new Date().toISOString(),
        status: ParcelStatus.PENDING
      };
      
      dbService.saveParcel(parcel);

      const message = await generateNotificationMessage(parcel);
      
      dbService.saveNotification({
        id: crypto.randomUUID(),
        parcelId: parcel.id,
        message,
        timestamp: new Date().toISOString(),
        read: false,
        unit: parcel.unit
      });
    } catch (err) {
      console.error("Falha ao registrar encomenda:", err);
    } finally {
      setLoading(false);
    }
  };

  if (viewMode === 'WELCOME') return <LandingPage onSelectRole={(r) => setViewMode(r === 'STAFF' ? 'AUTH_STAFF' : 'AUTH_RESIDENT')} />;
  if (viewMode === 'AUTH_STAFF') return <Auth mode="STAFF" onBack={() => setViewMode('WELCOME')} onSuccess={handleAuthSuccess} />;
  if (viewMode === 'AUTH_RESIDENT') return <Auth mode="RESIDENT" onBack={() => setViewMode('WELCOME')} onSuccess={handleAuthSuccess} />;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] animate-fade-in">
      <Navbar 
        viewMode={viewMode} 
        notifications={db.notifications}
        activeUnit={currentUser?.unit || ''}
        onMarkRead={(id) => dbService.markNotificationRead(id)}
        onLogout={handleLogout}
        userName={currentUser?.name}
        setViewMode={setViewMode}
      />
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        {viewMode === 'STAFF' ? (
          <StaffDashboard 
            parcels={db.parcels} 
            residents={db.residents} 
            notices={db.notices}
            onAdd={handleAddParcel}
            onCollect={(id, name) => dbService.collectParcel(id, name)}
            onDelete={(id) => dbService.deleteParcel(id)}
            onAddResident={(d) => dbService.saveResident({ ...d, id: crypto.randomUUID(), createdAt: new Date().toISOString() })}
            onDeleteResident={(id) => dbService.deleteResident(id)}
            onAddNotice={(n) => dbService.saveNotice({ ...n, id: crypto.randomUUID(), timestamp: new Date().toISOString(), author: currentUser?.name || 'Sistema' })}
            onDeleteNotice={(id) => dbService.deleteNotice(id)}
          />
        ) : (
          <ResidentDashboard 
            unit={currentUser?.unit || ''} 
            parcels={db.parcels.filter(p => p.unit === currentUser?.unit)}
            notices={db.notices}
            onCollect={(id, name) => dbService.collectParcel(id, name)}
          />
        )}
      </main>

      <footer className="bg-white border-t py-6 text-center text-slate-400 text-[10px] font-bold tracking-widest uppercase">
        CondoLink &copy; {new Date().getFullYear()} — Portaria & Notificações Inteligentes
      </footer>

      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-fade-in">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4 shadow-xl"></div>
          <p className="font-black text-blue-900 tracking-tight text-lg">Processando pela IA...</p>
        </div>
      )}
    </div>
  );
};

export default App;
