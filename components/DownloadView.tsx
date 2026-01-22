
import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';

interface DownloadViewProps {
  onBack: () => void;
}

const DownloadView: React.FC<DownloadViewProps> = ({ onBack }) => {
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('beforeinstallprompt disparado');
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handlePWAInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('Usuário aceitou a instalação');
        setDeferredPrompt(null);
      }
    } else {
      alert("Para instalar como Aplicativo:\n\nAndroid: Clique nos três pontos (menu) e selecione 'Instalar Aplicativo'.\niOS: Clique no ícone de 'Compartilhar' e selecione 'Adicionar à Tela de Início'.");
    }
  };

  const simulateDownload = (index: number, filename: string) => {
    if (downloadingIndex !== null) return;
    setDownloadingIndex(index);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const blob = new Blob(["SAMU Connect Binary Data"], { type: 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            setDownloadingIndex(null);
          }, 500);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  const downloadItems = [
    {
      title: 'Aplicativo Android (APK)',
      description: 'Binário compilado para tablets e smartphones de serviço. Permite acesso a recursos avançados de hardware.',
      icon: '🤖',
      action: 'Baixar APK v6.0',
      badge: 'Nativo',
      onClick: (i: number) => simulateDownload(i, 'samu_connect_v6.apk')
    },
    {
      title: 'Web App (Instalação Direta)',
      description: 'Transforma este site em um aplicativo de tela cheia sem precisar baixar arquivos externos.',
      icon: '📲',
      action: 'Instalar como App',
      badge: 'PWA',
      onClick: () => handlePWAInstall()
    },
    {
      title: 'Código Fonte (GitHub)',
      description: 'Acesse o repositório oficial para atualizações em tempo real e documentação técnica.',
      icon: '🐙',
      action: 'Ver Repositório',
      badge: 'Open Source',
      onClick: () => window.open('https://github.com', '_blank')
    }
  ];

  return (
    <div className="h-full bg-black flex flex-col p-8 animate-reveal overflow-y-auto no-scrollbar relative">
      <header className="flex items-center justify-between mb-12">
        <button onClick={onBack} className="text-white flex items-center gap-2 group">
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          <span className="text-xs font-bold uppercase tracking-widest">Painel SAMU</span>
        </button>
        <div className="w-8 h-8 bg-red-600 flex items-center justify-center rounded-lg shadow-lg shadow-red-900/20">
          <span className="text-white font-black text-xs">192</span>
        </div>
      </header>

      <div className="mb-10">
        <h1 className="text-4xl font-black text-white italic leading-tight uppercase tracking-tighter">
          Central de<br/>Distribuição
        </h1>
        <p className="text-zinc-500 text-sm mt-4 leading-relaxed max-w-xs">
          Hospedagem otimizada para GitHub Pages e distribuição via PWA/APK.
        </p>
      </div>

      <div className="space-y-4 mb-12">
        {downloadItems.map((item, index) => (
          <div key={index} className="uber-glass p-6 border-white/5 bg-[#0a0a0a] group hover:border-white/20 transition-all relative overflow-hidden">
            {downloadingIndex === index && (
              <div className="absolute bottom-0 left-0 h-1 bg-red-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
            )}
            
            <div className="flex justify-between items-start mb-4">
              <span className="text-3xl">{item.icon}</span>
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">
                {item.badge}
              </span>
            </div>
            <h3 className="text-white font-bold text-lg mb-1">{item.title}</h3>
            <p className="text-zinc-500 text-xs mb-6 leading-snug">{item.description}</p>
            
            <button 
              onClick={() => item.onClick(index)}
              disabled={downloadingIndex !== null}
              className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${
                downloadingIndex === index 
                ? 'bg-zinc-800 text-zinc-500' 
                : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              {downloadingIndex === index ? `Preparando ${progress}%` : item.action}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-auto py-8 border-t border-white/5 bg-zinc-950/50 p-6 rounded-2xl">
        <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-2">Dica de Deploy</h4>
        <p className="text-[10px] text-zinc-500 leading-relaxed italic">
          Para hospedar no seu perfil: Carregue estes arquivos em um repositório e ative as 'GitHub Pages'. O app funcionará imediatamente em qualquer subdiretório.
        </p>
      </div>
    </div>
  );
};

export default DownloadView;
