import React, { useState, useEffect } from 'react';
import { User, ViewState } from './types';
import { getCurrentUser, logout } from "./storageService"
import Login from './components/Auth';
import UserDashboard from './components/UserDashboard';
import AdminPanel from './components/AdminPanel';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.LOGIN);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setView(ViewState.DASHBOARD);
        }
        setLoading(false);
    };
    initApp();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setView(ViewState.DASHBOARD);
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setView(ViewState.LOGIN);
  };

  const handleAdminAccess = () => {
    setView(ViewState.ADMIN);
  };

  const renderView = () => {
    switch (view) {
      case ViewState.ADMIN:
        return <AdminPanel onBack={() => setView(ViewState.LOGIN)} />;
      case ViewState.DASHBOARD:
        return currentUser ? (
          <UserDashboard 
            user={currentUser} 
            onLogout={handleLogout} 
            onUpdateUser={setCurrentUser} 
          />
        ) : (
          <div className="text-center p-10">جاري تحميل البيانات...</div>
        );
      default:
        return <Login onLoginSuccess={handleLoginSuccess} onAdminClick={handleAdminAccess} />;
    }
  };

  if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-islamic-light">
             <div className="text-xl font-serif text-islamic-dark animate-pulse">جاري الاتصال بـ فجر فزارة...</div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-10">
      {/* Decorative Top Banner */}
      <div className="bg-islamic-dark h-24 w-full relative overflow-hidden shadow-lg">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-10"></div>
         
         {/* Egyptian Flag - Image Top Left */}
         <div className="absolute top-4 left-4 z-30 group" title="تحيا مصر">
            <img 
                src="https://flagcdn.com/w160/eg.png" 
                alt="علم مصر" 
                className="w-[60px] h-[40px] object-cover shadow-md rounded-[4px] transform group-hover:scale-110 transition-transform duration-300 ring-1 ring-white/30"
            />
         </div>

         <div className="container mx-auto h-full flex items-center justify-center px-4 relative z-10">
             <h1 className="text-4xl md:text-6xl font-bold text-white font-thuluth drop-shadow-md tracking-wide pt-2">
               فجر فزارة المشرق
             </h1>
         </div>
      </div>

      {/* Main Hadith Section */}
      <div className="container mx-auto px-4 -mt-6 relative z-20 mb-8">
        <div className="bg-white rounded-lg shadow-xl p-6 text-center border-t-4 border-islamic-gold max-w-3xl mx-auto">
          <p className="text-xl md:text-2xl font-serif text-gray-800 leading-relaxed">
            "مَن صلَّى الصُّبحَ في جماعةٍ فَهوَ في ذمَّةِ اللَّهِ..."
          </p>
          <p className="text-sm text-gray-500 mt-2 font-semibold">رواه مسلم</p>
        </div>
      </div>

      {/* Content Area */}
      <main className="container mx-auto px-4">
        {renderView()}
      </main>

      {/* Footer */}
      <footer className="mt-12 text-center text-gray-400 text-sm">
        <p>والحمد لله في بدءٍ ومختتمِ</p>
      </footer>
    </div>
  );
};

export default App;
