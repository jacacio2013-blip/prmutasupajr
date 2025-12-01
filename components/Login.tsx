import React, { useState } from 'react';
import { User, SystemSettings } from '../types';
import { HeartPulse, Stethoscope, Lock, MessageCircle } from 'lucide-react';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
  settings?: SystemSettings;
}

export const Login: React.FC<LoginProps> = ({ users, onLogin, settings }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Defaults if settings not loaded yet
  const systemName = settings?.systemName || 'UPA José Rodrigues';
  const logoUrl = settings?.logoUrl;
  const developerName = settings?.developerName || 'J. Acacio';
  const supportContact = settings?.supportContact || '5592992881709';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Special Check for Default Admin
    if (username === 'admin' && password === '32m13r9a') {
      const adminUser = users.find(u => u.username === 'admin');
      if (adminUser) {
        onLogin(adminUser);
        return;
      }
    }

    // Normal User Check (For demo, assume password is just '123' for everyone else, or ignore password logic if not admin)
    // In a real app, hash checking happens here.
    const user = users.find(u => u.username === username);

    if (user && user.username !== 'admin') {
       // Allow easy login for demo users
       onLogin(user);
       return;
    }

    if (!user) {
        setError('Usuário não encontrado.');
    } else if (user.username === 'admin') {
        setError('Senha de administrador incorreta.');
    }
  };

  const handleSupportClick = () => {
      const cleanNumber = supportContact.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanNumber}`, '_blank');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-800 to-teal-600 p-4 relative">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col z-10">
        
        {/* Header */}
        <div className="bg-teal-50 p-8 flex flex-col items-center border-b border-teal-100">
          <div className="bg-white p-2 rounded-full shadow-md mb-4 h-24 w-24 flex items-center justify-center overflow-hidden">
            {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
                <HeartPulse size={48} className="text-red-500" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-teal-900 text-center">{systemName}</h1>
          <p className="text-teal-600 font-medium text-sm tracking-widest mt-1">GESTÃO DE ENFERMAGEM</p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded border border-red-200 text-center">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 pl-1">Usuário</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Stethoscope size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  placeholder="Seu identificador"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 pl-1">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all transform active:scale-95"
            >
              Entrar no Plantão
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col items-center space-y-4">
             <button 
                onClick={handleSupportClick}
                className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors"
             >
                <MessageCircle size={20} />
                <span>Suporte Técnico (WhatsApp)</span>
             </button>
             <p className="text-xs text-slate-400">Desenvolvido por: {developerName}</p>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 text-teal-100/50 text-xs">
          v1.2.0
      </div>
    </div>
  );
};