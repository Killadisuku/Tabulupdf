import React, { useState } from 'react';
import { Globe, Copy, Check, QrCode, ExternalLink, Download, Sparkles, X, ShieldCheck } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = window.location.origin || 'https://ais-pre-lnkgyxabxaopwdeguiops5-562972553364.europe-west2.run.app';

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Global Access & Sharing</h3>
              <p className="text-[11px] text-slate-400">Available worldwide on any web browser</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Public Link Card */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Live Web URL (No login required)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none select-all"
              />
              <button
                onClick={handleCopy}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* QR Code generator placeholder for quick mobile scanning */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-4">
            <div className="w-20 h-20 bg-white rounded-lg p-1.5 flex items-center justify-center shrink-0 shadow-sm">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}`}
                alt="QR Code for mobile scan"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-xs font-semibold text-white flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                Scan to Open on Mobile
              </span>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Scan with any iPhone or Android camera to instantly launch TabulaPDF on your phone.
              </p>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>100% Private & In-Browser</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Installable PWA App</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
