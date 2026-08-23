import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Zap,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  CreditCard,
  ReceiptText,
  Layers,
  Search,
  Lock,
  Download,
  Building2,
  Table,
  Check,
  X
} from 'lucide-react';
import { SampleDoc } from '../utils/samplePdfs';

interface SeoContentSectionProps {
  onSelectSample?: (sample: SampleDoc) => void;
  onScrollToTop?: () => void;
}

export const SeoContentSection: React.FC<SeoContentSectionProps> = ({
  onSelectSample,
  onScrollToTop,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [selectedUseCategory, setSelectedUseCategory] = useState<string>('bank');

  const faqs = [
    {
      q: 'How does TabulaPDF convert PDF tables to Excel for free?',
      a: 'TabulaPDF uses advanced client-side layout analysis and coordinate bounding algorithms. When you upload a PDF, the engine scans text positional glyphs, bounding boxes, and vertical column alignments locally in your browser. It formats the table into an interactive grid and generates an authentic Microsoft Excel (.xlsx) file with clean formulas, column headers, and data types.',
    },
    {
      q: 'Is my data secure? Do you store my financial statements?',
      a: 'Yes, 100% secure. TabulaPDF is engineered with a strict privacy-first architecture. The core PDF rendering and table parsing executes entirely in your local browser memory via WebAssembly and PDF.js. Your sensitive bank statements, tax documents, and proprietary corporate ledgers are never uploaded, never saved to a database, and never shared with third parties.',
    },
    {
      q: 'Can I convert multi-page PDF documents into one continuous Excel sheet?',
      a: 'Yes! When you load a multi-page PDF (such as a 12-page annual bank statement or 50-page inventory manifest), TabulaPDF automatically creates individual page sheets and gives you a one-click "Consolidate All Pages" button. It aligns the table headers, removes duplicate headers, and unifies everything into one seamless Excel sheet.',
    },
    {
      q: 'How does AI OCR extraction work for scanned or messy PDFs?',
      a: 'For scanned paper documents, mobile phone photos, or documents without a text layer, you can activate the built-in Gemini AI Vision Engine. It visually inspects table boundaries, handles skewed photos, reconstructs merged header cells, and turns image pixels into structured tabular data.',
    },
    {
      q: 'What is the difference between TabulaPDF and desktop Tabula / Adobe?',
      a: 'Unlike traditional desktop Tabula which requires installing Java, TabulaPDF runs instantly in modern web browsers with a visual dual-pane preview, real-time cell editing, column splitting/merging, and direct Excel (.xlsx) export. Unlike Adobe Acrobat or paid SaaS tools, TabulaPDF has no paywalls, no email signups, and unlimited conversions.',
    },
    {
      q: 'What file formats can I export to?',
      a: 'You can export to Microsoft Excel (.xlsx) with styled header rows and automatic column widths, standard CSV (Comma-Separated Values for Python/Pandas/SQL), TSV (Tab-Separated for quick copy-pasting to Google Sheets), and structured JSON.',
    },
  ];

  const useCases = [
    {
      id: 'bank',
      title: 'Bank & Credit Card Statements',
      icon: <CreditCard className="w-5 h-5 text-emerald-400" />,
      tag: 'Bookkeeping & Taxes',
      desc: 'Convert PDF statements from Chase, Wells Fargo, Bank of America, Amex, and Barclays directly into clean QuickBooks/Xero-ready Excel spreadsheets with separate debit, credit, date, and description columns.',
      keywords: ['Chase PDF to Excel', 'Bank Statement to CSV', 'QuickBooks Import Helper'],
    },
    {
      id: 'invoice',
      title: 'Invoices & Purchase Orders',
      icon: <ReceiptText className="w-5 h-5 text-purple-400" />,
      tag: 'Accounts Payable',
      desc: 'Extract itemized line items, unit prices, product codes (SKU), tax breakdowns, and subtotals from single or batch supplier invoices without manual data entry.',
      keywords: ['Invoice Line Item Extractor', 'PDF PO to XLSX', 'AP Automation'],
    },
    {
      id: 'audit',
      title: 'Financial Reports & Audits',
      icon: <Building2 className="w-5 h-5 text-blue-400" />,
      tag: 'FP&A & Investing',
      desc: 'Extract income statements, balance sheets, cash flow schedules, and 10-K/10-Q filing tables into Excel with numerical precision and aligned decimal points.',
      keywords: ['10-K SEC Filing to Excel', 'Balance Sheet Parser', 'Financial Model Ingestion'],
    },
    {
      id: 'logistics',
      title: 'Logistics & Inventory Manifests',
      icon: <Table className="w-5 h-5 text-amber-400" />,
      tag: 'Supply Chain',
      desc: 'Process massive multi-page shipping bills, customs declarations, and warehouse stock lists into clean databases with column split/merge support.',
      keywords: ['Packing Slip to CSV', 'Inventory Manifest Parser', 'Bill of Lading Extraction'],
    },
  ];

  return (
    <section className="mt-16 border-t border-slate-800/80 pt-16 pb-20 text-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Value Proposition Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">100% In-Browser Privacy</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your financial documents and confidential business PDFs never touch an external server. Everything processes entirely inside your client browser.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Sub-Second Processing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Zero queuing and zero server roundtrips. Extract thousands of table cells and numeric values in milliseconds with instant live spreadsheet editing.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Hybrid OCR + Gemini Vision</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Native digital PDF vector parsing coupled with next-generation AI OCR to accurately extract tables from scanned documents, photos, and messy receipts.
            </p>
          </div>
        </div>

        {/* How It Works 3-Step Guide */}
        <div id="how-it-works" className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              How to Convert PDF Tables to Excel in 3 Steps
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl mx-auto">
              Follow this simple guide to extract structured tabular datasets from any PDF document.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col items-start">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center mb-4">
                1
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Upload or Drag & Drop</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Drop your PDF file into the workbench. TabulaPDF automatically renders each page and detects tabular matrices and bounding coordinates.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col items-start">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center mb-4">
                2
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Review, Clean & Consolidate</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inspect extracted tables side-by-side with your PDF. Use quick cleanup tools to split columns, remove empty rows, find & replace, or consolidate pages.
              </p>
            </div>

            <div className="relative p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col items-start">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center mb-4">
                3
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">Download Excel or CSV</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Export directly to Microsoft Excel (.xlsx) with styled headers, CSV for data science & SQL databases, or JSON for software integrations.
              </p>
            </div>
          </div>
        </div>

        {/* Specialized Document Solutions / Use Cases */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Tailored for Every Document Type
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl mx-auto">
              Optimized parsing heuristics for accounting, supply chain, and data science workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {useCases.map((uc) => (
              <div
                key={uc.id}
                className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                        {uc.icon}
                      </div>
                      <h3 className="text-sm font-bold text-white">{uc.title}</h3>
                    </div>
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {uc.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {uc.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                  {uc.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-slate-950/80 text-emerald-300/80 px-2 py-0.5 rounded border border-emerald-900/30"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Comparison Matrix */}
        <div className="mb-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Why Users Choose TabulaPDF
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl mx-auto">
              Compare TabulaPDF against traditional online converters and legacy desktop utilities.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-850/80 text-slate-300">
                  <th className="p-4 font-semibold">Feature / Capability</th>
                  <th className="p-4 font-bold text-emerald-400">TabulaPDF</th>
                  <th className="p-4 font-medium text-slate-400">Generic Online Converters</th>
                  <th className="p-4 font-medium text-slate-400">Legacy Desktop Tabula</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                <tr>
                  <td className="p-4 font-medium text-white">Client-Side Privacy (Zero Server Upload)</td>
                  <td className="p-4 text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" /> 100% Private (Local)
                  </td>
                  <td className="p-4 text-rose-400 flex items-center gap-1.5">
                    <X className="w-4 h-4 text-rose-400" /> Uploads files to remote servers
                  </td>
                  <td className="p-4 text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" /> Local
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Direct Microsoft Excel (.xlsx) Export</td>
                  <td className="p-4 text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" /> Formatted .XLSX + CSV + JSON
                  </td>
                  <td className="p-4 text-slate-300">Often behind paid paywall</td>
                  <td className="p-4 text-slate-400">CSV / TSV only</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">AI Vision OCR for Scanned Documents</td>
                  <td className="p-4 text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" /> Gemini Vision Engine
                  </td>
                  <td className="p-4 text-rose-400 flex items-center gap-1.5">
                    <X className="w-4 h-4 text-rose-400" /> Paid add-on
                  </td>
                  <td className="p-4 text-rose-400 flex items-center gap-1.5">
                    <X className="w-4 h-4 text-rose-400" /> Not supported
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Live Interactive Spreadsheet Grid Editor</td>
                  <td className="p-4 text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" /> In-browser Excel grid
                  </td>
                  <td className="p-4 text-rose-400 flex items-center gap-1.5">
                    <X className="w-4 h-4 text-rose-400" /> Download blind file only
                  </td>
                  <td className="p-4 text-slate-400">Basic preview</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Installation / Java Runtime Required</td>
                  <td className="p-4 text-emerald-400 font-semibold">No (Runs in any browser)</td>
                  <td className="p-4 text-emerald-400">No</td>
                  <td className="p-4 text-rose-400">Requires Java & desktop install</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-white">Cost & Account Creation</td>
                  <td className="p-4 text-emerald-400 font-bold">100% Free / No Account Needed</td>
                  <td className="p-4 text-slate-400">Daily caps / Paid subscription</td>
                  <td className="p-4 text-emerald-400">Free open source</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Accordion Section (Rich Snippets SEO) */}
        <div id="faq" className="max-w-3xl mx-auto mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Everything you need to know about converting PDF tables to Excel and CSV.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-white hover:text-emerald-300 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180 text-emerald-400' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA for Organic Traffic Conversion */}
        <div className="rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/20 p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
          
          <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-2 relative z-10">
            Ready to Extract Your First PDF Table?
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto mb-6 relative z-10">
            No signup, no software installation, and no email required. Start converting your documents in your browser right now.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 relative z-10">
            <button
              onClick={() => {
                if (onScrollToTop) {
                  onScrollToTop();
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Upload PDF Now (Free)
            </button>
          </div>
        </div>

        {/* Footer info & SEO breadcrumbs */}
        <div className="mt-16 pt-8 border-t border-slate-800/60 text-center text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-slate-400">TabulaPDF</span> © {new Date().getFullYear()} — Free In-Browser PDF to Excel & CSV Table Converter.
          </div>
          <div className="flex items-center gap-4">
            <a href="#how-it-works" className="hover:text-slate-300 transition-colors">How it works</a>
            <a href="#faq" className="hover:text-slate-300 transition-colors">FAQ</a>
            <span className="text-emerald-400/80">100% Private Client-Side</span>
          </div>
        </div>

      </div>
    </section>
  );
};
