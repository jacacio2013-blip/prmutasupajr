import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        <div className="bg-red-50 p-4 flex items-center border-b border-red-100">
          <div className="bg-red-100 p-2 rounded-full mr-3">
             <AlertTriangle className="text-red-600" size={24} />
          </div>
          <h3 className="font-bold text-red-900 text-lg">{title}</h3>
          <button onClick={onClose} className="ml-auto text-red-400 hover:text-red-600 p-1 hover:bg-red-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-slate-700 font-medium leading-relaxed">{message}</p>
        </div>
        <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-100">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }}
            className="px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            Confirmar Ação
          </button>
        </div>
      </div>
    </div>
  );
};