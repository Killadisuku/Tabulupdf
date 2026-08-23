import React from 'react';
import {
  Layers,
  CreditCard,
  TrendingUp,
  PackageCheck,
  ReceiptText,
  FileSpreadsheet,
  Download,
  ArrowRight,
  Eye,
  Check
} from 'lucide-react';
import { SAMPLE_DOCUMENTS, SampleDoc } from '../utils/samplePdfs';
import { exportToExcel } from '../utils/excelExport';

interface SampleVaultProps {
  onSelectSample: (sample: SampleDoc) => void;
}

export const SampleVault: React.FC<SampleVaultProps> = ({ onSelectSample }) => {
  const handleQuickExport = (e: React.MouseEvent, sample: SampleDoc) => {
    e.stopPropagation();
    exportToExcel(sample.sampleSheets, `${sample.id}_sample.xlsx`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <Layers className="w-3.5 h-3.5" />
          Pre-Formatted Test Document Library
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Sample PDF Document Vault
        </h2>
        <p className="text-slate-400 text-sm max-w-xl mx-auto mt-2">
          Test PDF table extraction with representative financial, logistics, and billing datasets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {SAMPLE_DOCUMENTS.map((sample) => {
          const totalRows = sample.sampleSheets.reduce((sum, s) => sum + s.rows.length, 0);
          const colCount = sample.sampleSheets[0]?.headers.length || 0;

          const getIcon = () => {
            switch (sample.id) {
              case 'bank-statement':
                return <CreditCard className="w-5 h-5 text-emerald-400" />;
              case 'sales-report':
                return <TrendingUp className="w-5 h-5 text-blue-400" />;
              case 'inventory-logistics':
                return <PackageCheck className="w-5 h-5 text-amber-400" />;
              case 'commercial-invoice':
                return <ReceiptText className="w-5 h-5 text-purple-400" />;
              default:
                return <FileSpreadsheet className="w-5 h-5 text-slate-400" />;
            }
          };

          return (
            <div
              key={sample.id}
              onClick={() => onSelectSample(sample)}
              className="group bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-emerald-950/20"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                      {getIcon()}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {sample.category}
                      </span>
                      <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {sample.title}
                      </h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {sample.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {sample.description}
                </p>

                {/* Table Schema Preview */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 mb-4">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
                    Columns ({colCount}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {sample.sampleSheets[0]?.headers.slice(0, 6).map((h, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 font-mono border border-slate-800"
                      >
                        {h}
                      </span>
                    ))}
                    {colCount > 6 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 font-mono">
                        +{colCount - 6} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  {sample.pageCount} page(s) • {totalRows} records
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleQuickExport(e, sample)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
                    title="Direct Download Excel (.xlsx)"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <span className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-all group-hover:shadow-md">
                    <span>Open in Workbench</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
