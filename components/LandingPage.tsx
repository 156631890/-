import React from 'react';
import { Camera, Database, Globe, Container, Store, ArrowRight, Zap, FileText } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/i18n';

interface LandingPageProps {
  onNavigate: (view: 'sourcing' | 'dashboard') => void;
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, currentLang, onLanguageChange }) => {
  const t = translations[currentLang];

  const toggleLanguage = () => {
     if (currentLang === 'en') onLanguageChange('zh');
     else if (currentLang === 'zh') onLanguageChange('es');
     else onLanguageChange('en');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
         <div className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
               <Container size={20} />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">Yiwu<span className="text-indigo-600">AI</span></span>
         </div>
         <button 
           onClick={toggleLanguage} 
           className="text-xs font-bold px-3 py-1.5 bg-slate-100 rounded-full text-slate-600 flex items-center gap-1.5 hover:bg-slate-200 transition-colors"
         >
            <Globe size={14}/> {currentLang.toUpperCase()}
         </button>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto w-full">
         <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl shadow-xl shadow-indigo-200 flex items-center justify-center mb-6 animate-in zoom-in duration-500">
            <Zap size={40} className="text-white" />
         </div>
         
         <h1 className="text-3xl font-extrabold text-slate-900 mb-3 leading-tight">
           {t.welcome}
         </h1>
         <p className="text-slate-500 text-sm mb-10 leading-relaxed px-4">
           {t.intro}
         </p>

         {/* Action Cards */}
         <div className="w-full space-y-4">
            
            {/* Sourcing Mode Card */}
            <button 
              onClick={() => onNavigate('sourcing')}
              className="w-full bg-white p-5 rounded-2xl shadow-sm border-2 border-slate-100 hover:border-indigo-500 hover:shadow-md transition-all group text-left relative overflow-hidden"
            >
               <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
               <div className="relative z-10 flex items-start gap-4">
                  <div className="bg-indigo-100 text-indigo-600 p-3 rounded-xl shrink-0">
                     <Camera size={24} />
                  </div>
                  <div>
                     <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                        {t.roleSourcing}
                        <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors"/>
                     </h3>
                     <p className="text-xs text-slate-500 mt-1 leading-relaxed pr-2">
                        {t.roleSourcingDesc}
                     </p>
                  </div>
               </div>
            </button>

            {/* Admin Mode Card */}
            <button 
              onClick={() => onNavigate('dashboard')}
              className="w-full bg-white p-5 rounded-2xl shadow-sm border-2 border-slate-100 hover:border-emerald-500 hover:shadow-md transition-all group text-left relative overflow-hidden"
            >
               <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
               <div className="relative z-10 flex items-start gap-4">
                  <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl shrink-0">
                     <Database size={24} />
                  </div>
                  <div>
                     <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                        {t.roleAdmin}
                        <ArrowRight size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors"/>
                     </h3>
                     <p className="text-xs text-slate-500 mt-1 leading-relaxed pr-2">
                        {t.roleAdminDesc}
                     </p>
                  </div>
               </div>
            </button>

         </div>
      </main>

      {/* Footer Features */}
      <footer className="p-6">
         <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2 rounded-lg border border-slate-100">
               <Globe size={16} className="mx-auto text-slate-400 mb-1"/>
               <span className="text-[10px] font-medium text-slate-500 block">Multilingual</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-100">
               <Zap size={16} className="mx-auto text-slate-400 mb-1"/>
               <span className="text-[10px] font-medium text-slate-500 block">AI Powered</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-100">
               <FileText size={16} className="mx-auto text-slate-400 mb-1"/>
               <span className="text-[10px] font-medium text-slate-500 block">Docs Export</span>
            </div>
         </div>
         <p className="text-center text-[10px] text-slate-300 mt-4">v2.1.0 • Secure Local Storage</p>
      </footer>
    </div>
  );
};

export default LandingPage;