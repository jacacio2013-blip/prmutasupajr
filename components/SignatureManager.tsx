import React, { useRef, useState, useEffect } from 'react';
import { User } from '../types';
import { Save, Eraser, Upload, CheckCircle2, PenTool } from 'lucide-react';

interface SignatureManagerProps {
  currentUser: User;
  onSaveSignature: (signatureUrl: string) => void;
}

export const SignatureManager: React.FC<SignatureManagerProps> = ({ currentUser, onSaveSignature }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState<string | null>(currentUser.signatureUrl || null);
  const [mode, setMode] = useState<'DRAW' | 'UPLOAD'>('DRAW');
  const [success, setSuccess] = useState('');

  // Setup Canvas Context
  useEffect(() => {
    if (mode === 'DRAW' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000000';
      }
    }
  }, [mode]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      // Calculate scale in case canvas is resized via CSS
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      let clientX, clientY;
      if ('touches' in e) {
         clientX = e.touches[0].clientX;
         clientY = e.touches[0].clientY;
      } else {
         clientX = (e as React.MouseEvent).clientX;
         clientY = (e as React.MouseEvent).clientY;
      }
      
      return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
      };
  };

  // Drawing Handlers
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Prevent default scrolling for touch events
    if ('touches' in e) {
      // e.preventDefault() here might block scrolling entirely on the page if not careful, 
      // but inside the canvas area it is desired.
      // However, React synthetic events might need e.preventDefault() in the handler prop or CSS touch-action.
    }

    setIsDrawing(true);
    const { x, y } = getCoordinates(e, canvas);

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if ('touches' in e) {
        // Prevent scrolling while drawing
        // Note: Ideally 'touch-action: none' should be in CSS
    }

    const { x, y } = getCoordinates(e, canvas);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    // Close the path to avoid connecting separate strokes if we wanted, 
    // but beginPath() in startDrawing handles the new stroke.
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSaveCanvas = () => {
    if (canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        setSignature(dataUrl);
        onSaveSignature(dataUrl);
        setSuccess('Assinatura salva com sucesso!');
        setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              const result = ev.target?.result as string;
              setSignature(result);
              onSaveSignature(result);
              setSuccess('Assinatura importada e salva!');
              setTimeout(() => setSuccess(''), 3000);
          };
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="bg-teal-600 p-6 flex justify-between items-center text-white">
                <div>
                    <h2 className="text-xl font-bold flex items-center"><PenTool className="mr-2"/> Assinatura Digital</h2>
                    <p className="text-teal-100 text-sm">Cadastre sua assinatura para validar documentos.</p>
                </div>
            </div>
            
            <div className="p-6 space-y-6">
                
                {success && (
                    <div className="bg-green-100 text-green-700 p-3 rounded-lg flex items-center font-bold">
                        <CheckCircle2 className="mr-2"/> {success}
                    </div>
                )}

                {/* Current Signature Preview */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-center">
                    <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase">Assinatura Atual</h3>
                    {signature ? (
                        <div className="flex flex-col items-center">
                            <img src={signature} alt="Assinatura" className="h-24 object-contain border-b border-slate-300 mb-2 px-4" />
                            <div className="text-center">
                                <p className="font-bold text-slate-800">{currentUser.name}</p>
                                <p className="text-xs text-slate-500">{currentUser.role}</p>
                                <p className="text-xs text-slate-500">{currentUser.coren ? `COREN: ${currentUser.coren}` : `Matrícula: ${currentUser.matricula}`}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-400 py-4 italic">Nenhuma assinatura cadastrada.</p>
                    )}
                </div>

                <div className="flex gap-2 justify-center">
                    <button 
                        onClick={() => setMode('DRAW')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold ${mode === 'DRAW' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                        Desenhar na Tela
                    </button>
                    <button 
                        onClick={() => setMode('UPLOAD')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold ${mode === 'UPLOAD' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >
                        Importar Imagem
                    </button>
                </div>

                {mode === 'DRAW' ? (
                    <div className="space-y-4">
                        <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white touch-none flex justify-center overflow-hidden">
                            <canvas
                                ref={canvasRef}
                                width={500}
                                height={200}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                                className="bg-white cursor-crosshair w-full max-w-full"
                                style={{ touchAction: 'none' }} 
                            />
                        </div>
                        <div className="flex justify-between">
                            <button onClick={clearCanvas} className="flex items-center text-slate-500 hover:text-red-500 font-medium">
                                <Eraser size={18} className="mr-1"/> Limpar
                            </button>
                            <button onClick={handleSaveCanvas} className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700 flex items-center">
                                <Save size={18} className="mr-2"/> Salvar Assinatura
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 p-10 text-center">
                        <Upload size={48} className="mx-auto text-slate-400 mb-4"/>
                        <p className="text-slate-600 font-medium mb-4">Selecione uma imagem da sua assinatura (Fundo transparente preferível)</p>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="block w-full text-sm text-slate-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-full file:border-0
                              file:text-sm file:font-semibold
                              file:bg-teal-50 file:text-teal-700
                              hover:file:bg-teal-100
                            "
                        />
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};