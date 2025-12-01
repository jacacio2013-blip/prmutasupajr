import React from 'react';
import { LeaveRequest, SystemSettings, RequestType, SignatureData } from '../types';

interface RequestDocumentProps {
  request: LeaveRequest;
  settings: SystemSettings;
  className?: string;
  batchDates?: string[]; // Optional: For previewing multiple dates
}

export const RequestDocument: React.FC<RequestDocumentProps> = ({ request, settings, className = '', batchDates }) => {
  const formatDate = (d: string) => {
      // Handle cases where d might be incomplete or just a month string if vacation
      if (request.type === RequestType.VACATION) return d; 
      return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
  };
  
  // Helper to render a signature block
  const SignatureBlock = ({ label, data }: { label: string, data?: SignatureData }) => (
      <div className="flex flex-col items-center justify-end h-32 w-48 mx-2">
          {data ? (
              <>
                  <img src={data.signatureUrl} alt="Assinatura" className="h-16 object-contain mb-1" />
                  <div className="w-full border-t border-slate-800"></div>
                  <p className="text-[10px] font-bold mt-1 text-center">{data.name}</p>
                  <p className="text-[9px] text-center">{data.role}</p>
                  <p className="text-[9px] text-center">Coren/Mat: {data.corenOrMatricula}</p>
                  <p className="text-[8px] text-slate-500 text-center">{formatDate(data.date.split('T')[0])}</p>
              </>
          ) : (
              <>
                  <div className="w-full border-t border-slate-400 border-dashed"></div>
                  <p className="text-xs font-medium mt-2 text-slate-400 text-center">{label}</p>
                  <p className="text-[10px] text-slate-300 text-center">(Pendente)</p>
              </>
          )}
      </div>
  );

  const getDateLabel = () => {
      if (request.type === RequestType.VACATION) return "Mês de Competência";
      if (request.type === RequestType.REGULAR_SWAP || request.type === RequestType.EXTRA_SWAP) return "Data da Substituição";
      return "Data da Folga";
  };

  const renderDates = () => {
      // If batchDates is provided (Preview mode with multiple dates)
      if (batchDates && batchDates.length > 0) {
          if (batchDates.length === 1) return formatDate(batchDates[0]);
          return (
              <div className="flex flex-wrap gap-1">
                  {batchDates.map((d, i) => (
                      <span key={i} className="bg-slate-100 px-1.5 py-0.5 rounded text-xs border border-slate-200">
                          {formatDate(d)}
                      </span>
                  ))}
              </div>
          );
      }
      // Default single date
      return formatDate(request.dateStart);
  };

  return (
    <div className={`bg-white p-8 shadow-lg border border-slate-200 max-w-3xl mx-auto print:shadow-none print:border-none ${className}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-6">
            <div className="flex items-center">
                {settings.logoUrl && (
                    <img src={settings.logoUrl} alt="Logo" className="h-16 w-16 object-contain mr-4" />
                )}
                <div>
                    <h1 className="text-xl font-bold text-slate-900 uppercase">{settings.systemName}</h1>
                    <p className="text-xs text-slate-600 font-medium tracking-wider">COMPROVANTE DE SOLICITAÇÃO</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-sm font-bold text-slate-500">Protocolo: #{request.id.slice(-6)}</p>
                <p className="text-xs text-slate-400">{new Date(request.createdAt).toLocaleString('pt-BR')}</p>
            </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <h2 className="text-sm font-bold text-slate-700 border-b border-slate-300 pb-2 mb-3 uppercase">Dados do Solicitante</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="block text-xs text-slate-500">Nome:</span>
                        <span className="font-medium">{request.signatures?.requester?.name || request.userName}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-slate-500">Cargo / Função:</span>
                        <span className="font-bold text-slate-800">{request.signatures?.requester?.role || request.userRole}</span>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <h2 className="text-sm font-bold text-slate-700 border-b border-slate-300 pb-2 mb-3 uppercase">Detalhes da Solicitação</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="block text-xs text-slate-500">Tipo:</span>
                        <span className="font-bold text-teal-700">{request.type}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-slate-500">Cargo do Funcionário:</span>
                        <span className="font-medium text-slate-800">{request.userRole}</span>
                    </div>
                    <div className="col-span-2">
                        <span className="block text-xs text-slate-500">{getDateLabel()}:</span>
                        <div className="font-bold text-slate-900">{renderDates()}</div>
                    </div>
                    
                    {request.coveringEmployee && (
                        <div className="col-span-2 mt-2 pt-2 border-t border-slate-200">
                             <span className="block text-xs font-bold text-slate-500 mb-1">Dados do Substituto (Cobertura):</span>
                             <div className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                                 <div>
                                    <span className="block font-bold text-indigo-700">{request.coveringEmployee}</span>
                                    <span className="text-xs text-slate-500">Cargo: {request.userRole}</span> {/* Role must match requester */}
                                 </div>
                             </div>
                        </div>
                    )}
                    
                    <div className="col-span-2 mt-2">
                        <span className="block text-xs text-slate-500">Justificativa:</span>
                        <p className="italic text-slate-700 mt-1 bg-white p-2 rounded border border-slate-200">{request.description}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Signatures Area */}
        <div className="mt-12 pt-4">
            <h3 className="text-center text-xs font-bold text-slate-400 uppercase mb-8">Área de Assinaturas</h3>
            
            <div className="flex flex-wrap justify-center gap-8">
                {/* 1. Requester */}
                <SignatureBlock 
                    label="Assinatura do Solicitante" 
                    data={request.signatures?.requester} 
                />

                {/* 2. Substitute (Only for Swaps) */}
                {(request.type === RequestType.REGULAR_SWAP || request.type === RequestType.EXTRA_SWAP) && (
                    <SignatureBlock 
                        label="Assinatura do Substituto" 
                        data={request.signatures?.substitute} 
                    />
                )}

                {/* 3. Manager (Always) */}
                <SignatureBlock 
                    label="Gerência de Enfermagem" 
                    data={request.signatures?.manager} 
                />
            </div>
        </div>

        <div className="mt-12 pt-4 border-t border-slate-200 text-center">
            <p className="text-[10px] text-slate-400">Documento gerado eletronicamente em {new Date().toLocaleString('pt-BR')}. A validade deste documento está condicionada às assinaturas digitais registradas no sistema.</p>
        </div>
    </div>
  );
};