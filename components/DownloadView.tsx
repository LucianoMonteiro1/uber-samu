
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
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handlePWAInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      alert("Para instalar: Clique no ícone de compartilhamento (iOS) ou nos três pontos do navegador e selecione 'Adicionar à tela de início' ou 'Instalar Aplicativo'.");
    }
  };

  const simulateDownload = (index: number, filename: string, type: string) => {
    if (downloadingIndex !== null) return;
    
    setDownloadingIndex(index);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            // Gera um arquivo "dummy" para download real no navegador
            const blob = new Blob(["Conteúdo do arquivo SAMU Connect"], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
            
            setDownloadingIndex(null);
            setProgress(0);
          }, 500);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 150);
  };

  const downloadItems = [
    {
      title: 'Versão Windows',
      description: 'Aplicativo desktop (.exe) para central de regulação e monitoramento avançado.',
      icon: '🪟',
      action: 'Baixar Instalação v4.2',
      badge: 'Desktop',
      onClick: (i: number) => simulateDownload(i, 'samu_connect_win_v4.2.exe', 'application/x-msdownload')
    },
    {
      title: 'Versão Android (APK)',
      description: 'Instalação direta para tablets e smartphones Android.',
      icon: '🤖',
      action: 'Baixar APK v4.2',
      badge: 'Mobile',
      onClick: (i: number) => simulateDownload(i, 'samu_ariquemes_v4.2.apk', 'application/vnd.android.package-archive')
    },
    {
      title: 'Versão iOS (PWA)',
      description: 'Instale agora para notificações em tempo real e uso offline total.',
      icon: '🍎',
      action: 'Instalar no Dispositivo',
      badge: 'PWA',
      onClick: () => handlePWAInstall()
    },
    {
      title: 'Manual do Condutor',
      description: 'Protocolos de navegação e operação do sistema.',
      icon: '📖',
      action: 'Baixar PDF',
      badge: 'Documento',
      onClick: (i: number) => simulateDownload(i, 'manual_condutor_samu.pdf', 'application/pdf')
    },
    {
      title: 'Checklist de Viatura',
      description: 'Formulário para conferência diária de materiais.',
      icon: '📋',
      action: 'Baixar Planilha',
      badge: 'XLSX',
      onClick: (i: number) => simulateDownload(i, 'checklist_viatura.xlsx', 'application/vnd.ms-excel')
    }
  ];

  return (
    <div className="h-full bg-black flex flex-col p-8 animate-reveal overflow-y-auto no-scrollbar relative">
      <header className="flex items-center justify-between mb-12">
        <button onClick={onBack} className="text-white flex items-center gap-2 group">
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          <span className="text-xs font-bold uppercase tracking-widest">Voltar ao Início</span>
        </button>
        <div className="w-8 h-8 bg-white flex items-center justify-center rounded-lg">
          <span className="text-black font-black text-xs">192</span>
        </div>
      </header>

      <div className="mb-10">
        <h1 className="text-4xl font-black text-white italic leading-tight uppercase tracking-tighter">
          Central de<br/>Downloads
        </h1>
        <p className="text-zinc-500 text-sm mt-4 leading-relaxed max-w-xs">
          Instale o SAMU Connect para garantir a telemetria em tempo real e protocolos offline.
        </p>
      </div>

      <div className="space-y-4 mb-12">
        {downloadItems.map((item, index) => (
          <div key={index} className="uber-glass p-6 border-white/5 bg-[#0a0a0a] group hover:border-white/20 transition-all relative overflow-hidden">
            {downloadingIndex === index && (
              <div className="absolute bottom-0 left-0 h-1 bg-white transition-all duration-300" style={{ width: `${progress}%` }}></div>
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
              className={`w-full py-3 rounded-lg font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${
                downloadingIndex === index 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              {downloadingIndex === index ? (
                <span>Preparando {Math.round(progress)}%</span>
              ) : (
                <>
                  <ICONS.Download />
                  {item.action}
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-auto py-8 border-t border-white/5 text-center">
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em]">
          Suporte Técnico: (69) 3536-2192
        </p>
        <p className="text-[8px] text-zinc-800 mt-2">
          Build ID: 2024.12.AQUIR • Licença Governamental
        </p>
      </div>
    </div>
  );
};

export default DownloadView;
