import React, { useState } from 'react';
import { User } from '../types';
import { UserCog, Save, Lock, Mail, Phone } from 'lucide-react';

interface UserProfileProps {
  currentUser: User;
  onUpdateUser: (user: User) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ currentUser, onUpdateUser }) => {
  const [formData, setFormData] = useState({
    email: currentUser.email || '',
    contact: currentUser.contact || '',
    newPassword: '',
    confirmPassword: ''
  });
  const [msg, setMsg] = useState({ type: '', text: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setMsg({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }

    const updatedUser = {
      ...currentUser,
      email: formData.email,
      contact: formData.contact,
      password: formData.newPassword ? formData.newPassword : currentUser.password
    };

    onUpdateUser(updatedUser);
    setMsg({ type: 'success', text: 'Dados atualizados com sucesso!' });
    setFormData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-teal-50 flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-teal-600 flex items-center justify-center text-white text-2xl font-bold">
                {currentUser.name.charAt(0)}
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800">{currentUser.name}</h2>
                <p className="text-teal-600 text-sm">{currentUser.role} - {currentUser.username}</p>
            </div>
        </div>

        <div className="p-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                <UserCog size={20} className="mr-2 text-teal-600"/> Editar Meus Dados
            </h3>

            {msg.text && (
                <div className={`mb-6 p-3 rounded text-sm font-bold ${msg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {msg.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 flex items-center">
                            <Mail size={14} className="mr-1"/> Email
                        </label>
                        <input 
                            type="email" 
                            className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded focus:ring-2 focus:ring-teal-500 outline-none" 
                            value={formData.email} 
                            onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 flex items-center">
                            <Phone size={14} className="mr-1"/> Whatsapp / Contato
                        </label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded focus:ring-2 focus:ring-teal-500 outline-none" 
                            value={formData.contact} 
                            onChange={e => setFormData({...formData, contact: e.target.value})}
                        />
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                     <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center">
                        <Lock size={16} className="mr-2"/> Alterar Senha
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1">Nova Senha</label>
                            <input 
                                type="password" 
                                placeholder="Deixe em branco para manter"
                                className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded focus:ring-2 focus:ring-teal-500 outline-none" 
                                value={formData.newPassword} 
                                onChange={e => setFormData({...formData, newPassword: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1">Confirmar Nova Senha</label>
                            <input 
                                type="password" 
                                placeholder="Repita a nova senha"
                                className="w-full border border-slate-300 bg-white text-slate-900 p-2 rounded focus:ring-2 focus:ring-teal-500 outline-none" 
                                value={formData.confirmPassword} 
                                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                            />
                        </div>
                     </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button 
                        type="submit" 
                        className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700 shadow-md flex items-center"
                    >
                        <Save size={18} className="mr-2"/> Salvar Alterações
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};