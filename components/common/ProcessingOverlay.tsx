import React from 'react';
import { Loader2 } from 'lucide-react';

interface ProcessingOverlayProps {
  text: string;
  current?: number;
  total?: number;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ text, current = 0, total = 0 }) => {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center text-indigo-600">
      <Loader2 className="animate-spin mb-4" size={48} />
      <p className="font-bold text-lg text-slate-800">{text}</p>
      {total > 0 && (
        <div className="w-64 h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
};
