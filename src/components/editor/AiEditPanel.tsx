import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  ArrowRight,
  RotateCcw,
  Check,
  AlertCircle,
  Clock,
  HelpCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Trash2,
  Table as TableIcon,
  Tag,
  Loader2
} from 'lucide-react';
import {
  AiEditAction,
  AiEditPlanResult,
  AiEditHistoryEntry,
  AmbiguityChoice
} from '../../utils/aiEditEngine';

interface AiEditPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyzeInstruction: (instruction: string) => Promise<AiEditPlanResult | null>;
  onApplyPlan: (plan: AiEditPlanResult) => void;
  onClearPreview: () => void;
  isAnalyzing: boolean;
  currentPlan: AiEditPlanResult | null;
  history: AiEditHistoryEntry[];
  onUndoHistoryEntry: (entry: AiEditHistoryEntry) => void;
}

export const AiEditPanel: React.FC<AiEditPanelProps> = ({
  isOpen,
  onClose,
  onAnalyzeInstruction,
  onApplyPlan,
  onClearPreview,
  isAnalyzing,
  currentPlan,
  history,
  onUndoHistoryEntry,
}) => {
  const [instruction, setInstruction] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'history'>('edit');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedEditIds, setSelectedEditIds] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && activeTab === 'edit') {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen, activeTab]);

  // Sync selected edit IDs whenever currentPlan changes
  useEffect(() => {
    if (currentPlan && currentPlan.edits) {
      setSelectedEditIds(new Set(currentPlan.edits.map((e) => e.id)));
    } else {
      setSelectedEditIds(new Set());
    }
  }, [currentPlan]);

  if (!isOpen) return null;

  const samplePrompts = [
    'Change the date to 30/08/2026',
    'Change the date to today',
    'Change Needle Valve quantity to 10',
    'Update PO number to AOT-SG-3008-01',
    'Change purchaser to XYZ Trading LLC',
    'Replace the phone number with +971 55 123 4567',
    'Remove the phone number',
    'Delete the Valve row',
  ];

  const handleSelectSample = (prompt: string) => {
    setInstruction(prompt);
    setErrorMsg(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!instruction.trim() || isAnalyzing) return;

    setErrorMsg(null);
    const result = await onAnalyzeInstruction(instruction.trim());

    if (result && !result.found && !result.isSuggestion && result.notFoundMessage) {
      setErrorMsg(result.notFoundMessage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit();
    }
  };

  const toggleEditSelection = (editId: string) => {
    setSelectedEditIds((prev) => {
      const next = new Set(prev);
      if (next.has(editId)) {
        next.delete(editId);
      } else {
        next.add(editId);
      }
      return next;
    });
  };

  const handleApply = () => {
    if (!currentPlan) return;
    const filteredEdits = currentPlan.edits.filter((e) => selectedEditIds.has(e.id));
    if (filteredEdits.length === 0) return;

    const planToApply: AiEditPlanResult = {
      ...currentPlan,
      edits: filteredEdits,
    };

    onApplyPlan(planToApply);
    setInstruction('');
  };

  const handleSelectAmbiguityChoice = (choice: AmbiguityChoice) => {
    if (!currentPlan) return;
    const edit: AiEditAction = {
      id: `edit-${Date.now()}`,
      type: 'replace_text',
      description: `Change ${choice.label} "${choice.oldValue}" to "${choice.replacementText}"`,
      fieldLabel: choice.label,
      pageNumber: choice.pageNumber,
      targetText: choice.targetText,
      replacementText: choice.replacementText,
      oldValue: choice.oldValue,
      newValue: choice.replacementText,
      selected: true,
      highlightBox: currentPlan.edits[0]?.highlightBox,
    };

    const updatedPlan: AiEditPlanResult = {
      ...currentPlan,
      isAmbiguous: false,
      explanation: `Selected ${choice.label} on page ${choice.pageNumber}.\nCurrent value: ${choice.oldValue} → New value: ${choice.replacementText}`,
      changesSummary: `${choice.label}: ${choice.oldValue} → ${choice.replacementText}`,
      edits: [edit],
      highlightBoxes: [
        {
          id: `hl-${edit.id}`,
          pageNumber: choice.pageNumber,
          x: edit.highlightBox?.x || 50,
          y: edit.highlightBox?.y || 50,
          width: edit.highlightBox?.width || 120,
          height: edit.highlightBox?.height || 20,
          label: `${choice.oldValue} → ${choice.replacementText}`,
          actionType: 'replace',
        },
      ],
    };

    onApplyPlan(updatedPlan);
    setInstruction('');
  };

  const handleCancelPreview = () => {
    onClearPreview();
    setErrorMsg(null);
  };

  const activeEditsCount = currentPlan?.edits.filter((e) => selectedEditIds.has(e.id)).length || 0;

  return (
    <aside
      className="fixed z-40 bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 shadow-2xl transition-all duration-200 ease-out flex flex-col pointer-events-auto
        /* Mobile: Bottom Sheet */
        bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl border-b-0
        /* Desktop: Floating Side Panel */
        sm:bottom-6 sm:right-6 sm:left-auto sm:w-[410px] sm:max-h-[calc(100vh-100px)] sm:rounded-2xl sm:border"
      aria-label="AI Edit Panel"
    >
      {/* 1. HEADER */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-bold text-white tracking-wide">AI Edit</h2>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                Context-Aware
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-none mt-0.5">
              Describe what you want changed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* History Tab Switcher */}
          <button
            onClick={() => setActiveTab(activeTab === 'edit' ? 'history' : 'edit')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-slate-800 text-emerald-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="View AI Edit History"
          >
            <Clock className="w-3.5 h-3.5" />
            {history.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center justify-center font-bold">
                {history.length}
              </span>
            )}
          </button>

          {/* Close Panel Button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close AI Edit Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. BODY CONTENT (SCROLLABLE) */}
      <div className="p-3.5 overflow-y-auto max-h-[62vh] sm:max-h-[calc(100vh-220px)] space-y-3.5">
        {activeTab === 'history' ? (
          /* HISTORY TAB */
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Session Edit History</span>
              <button
                onClick={() => setActiveTab('edit')}
                className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
              >
                Back to Edit
              </button>
            </div>

            {history.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No AI modifications in this session yet.
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{entry.prompt}</span>
                      </div>
                      <button
                        onClick={() => onUndoHistoryEntry(entry)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                        title="Revert this AI change"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400" />
                        <span>Undo</span>
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-400 pl-5">{entry.summary}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* EDIT TAB */
          <>
            {/* SMART SUGGESTION CARD (When user gave slightly mismatched old value, but AI found the actual field) */}
            {currentPlan && currentPlan.isSuggestion && (
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2.5 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-amber-200">Did you mean this?</h3>
                    <p className="text-[11px] text-amber-300/90 leading-relaxed mt-0.5">
                      {currentPlan.suggestionMessage || 'I found a matching field in the document.'}
                    </p>
                  </div>
                </div>

                {/* Diff preview */}
                {currentPlan.edits[0] && (
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-amber-500/20 text-xs flex items-center justify-between">
                    <span className="text-slate-400 font-mono">
                      {currentPlan.edits[0].fieldLabel || 'Field'}:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="line-through text-slate-400">{currentPlan.edits[0].oldValue || currentPlan.edits[0].targetText}</span>
                      <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="font-semibold text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded">
                        {currentPlan.edits[0].newValue || currentPlan.edits[0].replacementText}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleCancelPreview}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Apply Suggestion</span>
                  </button>
                </div>
              </div>
            )}

            {/* MULTIPLE DATES / AMBIGUITY PICKER */}
            {currentPlan && currentPlan.isAmbiguous && currentPlan.ambiguityChoices && currentPlan.ambiguityChoices.length > 0 && (
              <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/40 space-y-2.5 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-sky-200">
                      Multiple matches found
                    </h3>
                    <p className="text-[11px] text-sky-300/90 leading-relaxed mt-0.5">
                      {currentPlan.ambiguityMessage || 'Select which field you would like to update:'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {currentPlan.ambiguityChoices.map((choice, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectAmbiguityChoice(choice)}
                      className="w-full p-2 rounded-lg bg-slate-900/90 hover:bg-sky-950/60 border border-slate-800 hover:border-sky-500/50 text-left text-xs transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-slate-200 group-hover:text-sky-300 flex items-center gap-1.5">
                          <Tag className="w-3 h-3 text-sky-400" />
                          <span>{choice.label}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Current: <span className="font-mono text-slate-300">{choice.oldValue}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                        <span>Change to {choice.replacementText}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleCancelPreview}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* NORMAL PROPOSED CHANGES PREVIEW CARD */}
            {currentPlan && currentPlan.found && !currentPlan.isSuggestion && !currentPlan.isAmbiguous && (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2.5 animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {currentPlan.edits.length === 1
                        ? '1 modification previewed'
                        : `${currentPlan.edits.length} modifications previewed`}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400/80 uppercase font-mono tracking-wider font-semibold">
                    Highlighted on PDF
                  </span>
                </div>

                {/* AI Reasoning / Understanding Banner */}
                {currentPlan.explanation && (
                  <div className="p-2 rounded-lg bg-slate-900/90 border border-emerald-500/20 text-[11px] text-slate-300 space-y-1">
                    <div className="font-semibold text-emerald-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>AI Identified:</span>
                    </div>
                    <p className="whitespace-pre-line text-slate-300/90 leading-relaxed font-sans pl-4">
                      {currentPlan.explanation}
                    </p>
                  </div>
                )}

                {/* List of modifications with checkboxes */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {currentPlan.edits.map((edit) => {
                    const isChecked = selectedEditIds.has(edit.id);
                    return (
                      <div
                        key={edit.id}
                        onClick={() => toggleEditSelection(edit.id)}
                        className={`p-2 rounded-lg border text-xs space-y-1 transition-colors cursor-pointer select-none ${
                          isChecked
                            ? 'bg-slate-900/90 border-slate-700'
                            : 'bg-slate-950/40 border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by parent div
                              className="rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                            />
                            {edit.fieldLabel ? (
                              <span className="text-emerald-300 font-bold">{edit.fieldLabel}</span>
                            ) : (
                              <span>
                                {edit.type === 'replace_text' && 'Replace Text'}
                                {edit.type === 'delete_text' && 'Delete Text'}
                                {edit.type === 'update_table_cell' && 'Update Cell'}
                                {edit.type === 'add_table_row' && 'Add Row'}
                                {edit.type === 'delete_table_row' && 'Delete Row'}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[10px]">Page {edit.pageNumber}</span>
                        </div>

                        {/* Diff details */}
                        {edit.type === 'replace_text' && (
                          <div className="flex items-center gap-1.5 text-xs pl-5">
                            <span className="line-through text-rose-300 bg-rose-950/50 px-1 py-0.5 rounded">
                              {edit.targetText}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="font-semibold text-emerald-300 bg-emerald-950/50 px-1 py-0.5 rounded">
                              {edit.replacementText}
                            </span>
                          </div>
                        )}

                        {edit.type === 'update_table_cell' && (
                          <div className="flex items-center gap-1.5 text-xs pl-5">
                            {edit.oldValue && (
                              <>
                                <span className="line-through text-slate-400">{edit.oldValue}</span>
                                <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                              </>
                            )}
                            <span className="font-semibold text-emerald-300">{edit.newValue}</span>
                          </div>
                        )}

                        {edit.type === 'delete_text' && (
                          <div className="text-[11px] text-rose-300/90 pl-5">
                            Remove "{edit.targetText}"
                          </div>
                        )}

                        {edit.description && edit.type !== 'replace_text' && edit.type !== 'delete_text' && (
                          <div className="text-[11px] text-slate-400 pl-5">{edit.description}</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Confirmation Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleCancelPreview}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApply}
                    disabled={activeEditsCount === 0}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>
                      {activeEditsCount > 1
                        ? `Apply Selected (${activeEditsCount})`
                        : 'Apply Change'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* ERROR / NOT FOUND MESSAGE */}
            {errorMsg && !currentPlan?.found && !currentPlan?.isSuggestion && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-1.5 font-semibold text-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Field Not Recognized</span>
                </div>
                <p className="text-[11px] text-rose-300/90 leading-relaxed">{errorMsg}</p>
              </div>
            )}

            {/* NATURAL LANGUAGE INPUT FORM */}
            <form onSubmit={handleFormSubmit} className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Tell me what you want to change...
              </label>

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. Change the date to 30/08/2026, change Needle Valve quantity to 10..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none transition-all"
                  disabled={isAnalyzing}
                />

                {instruction && !isAnalyzing && (
                  <button
                    type="button"
                    onClick={() => setInstruction('')}
                    className="absolute top-2 right-2 p-1 rounded-md text-slate-500 hover:text-slate-300 cursor-pointer"
                    title="Clear input"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* ACTION BUTTON */}
              <button
                type="submit"
                disabled={!instruction.trim() || isAnalyzing}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing PDF Structure & Context...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Analyze & Preview Edit</span>
                  </>
                )}
              </button>
            </form>

            {/* EXAMPLE PROMPTS PILLS */}
            {!currentPlan && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-400">Natural examples:</span>
                <div className="flex flex-wrap gap-1.5">
                  {samplePrompts.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectSample(sample)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 hover:border-emerald-500/40 text-[11px] text-slate-300 hover:text-white transition-all text-left truncate max-w-full cursor-pointer"
                    >
                      "{sample}"
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
