import React, { useState } from 'react';
import { Share2, Bookmark, Check, Twitter, Linkedin, MessageCircle, Heart } from 'lucide-react';

export const TrafficBoosterBar: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tabulapdf.vercel.app';
  const shareText = 'TabulaPDF - 100% Free, Private Client-Side PDF to Excel & Word Converter';

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-400">
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
          <span className="hidden sm:inline">Enjoying TabulaPDF? Free & Unlimited with 100% in-browser privacy.</span>
          <span className="sm:hidden">100% Free & In-Browser Private</span>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={handleShareTwitter}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-[#1DA1F2]/20 text-slate-400 hover:text-[#1DA1F2] border border-slate-800 transition-colors"
            title="Share on Twitter / X"
          >
            <Twitter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleShareLinkedIn}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-[#0A66C2]/20 text-slate-400 hover:text-[#0A66C2] border border-slate-800 transition-colors"
            title="Share on LinkedIn"
          >
            <Linkedin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-[#25D366]/20 text-slate-400 hover:text-[#25D366] border border-slate-800 transition-colors"
            title="Share on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopyLink}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
            title="Copy URL"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3 h-3 text-slate-400" />
                <span className="text-[11px]">Share</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
