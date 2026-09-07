'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { CheckCircle, XCircle, Clock, Trophy, Sparkles, Brain, BookOpen, RefreshCw, Globe, FileText, Send, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface QuestionResult {
  questionText: string;
  options: string[];
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  explanation?: string;
}

interface ResultViewProps {
  score: number;
  timeTaken: number;
  questions: QuestionResult[];
  topic?: string;
  courseId?: string;
  onRetry?: () => void;
  onBack?: () => void;
}

interface RemediationState {
  loading: boolean;
  misconception?: string;
  microLesson?: string;
  retryQuestion?: {
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  };
  selectedRetryOption?: string;
  retrySubmitted?: boolean;
  error?: string;
}

interface CRAGState {
  loading: boolean;
  query: string;
  answer?: string;
  webSearchUsed?: boolean;
  documentsUsed?: number;
  error?: string;
}

export function ResultView({ score, timeTaken, questions, topic = 'General Quiz', courseId = '', onRetry, onBack }: ResultViewProps) {
  const [remediations, setRemediations] = useState<Record<number, RemediationState>>({});
  const [cragStates, setCragStates] = useState<Record<number, CRAGState>>({});

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const handleRemediate = async (index: number, q: QuestionResult) => {
    setRemediations(prev => ({
      ...prev,
      [index]: { loading: true, error: '' }
    }));

    try {
      const res = await fetch('/api/agents/quiz/remediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic || 'General Topic',
          questionText: q.questionText,
          userAnswer: q.userAnswer || 'No answer',
          correctAnswer: q.correctAnswer,
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate remediation');
      }

      const data = await res.json();
      setRemediations(prev => ({
        ...prev,
        [index]: {
          loading: false,
          misconception: data.misconception,
          microLesson: data.microLesson,
          retryQuestion: data.retryQuestion,
        }
      }));
    } catch (err: any) {
      setRemediations(prev => ({
        ...prev,
        [index]: { loading: false, error: err.message || 'Remediation error' }
      }));
    }
  };

  const handleCRAGQuery = async (index: number, customQuery?: string) => {
    const q = questions[index];
    const queryText = customQuery || cragStates[index]?.query || `Explain why "${q.correctAnswer}" is correct for "${q.questionText}"`;

    setCragStates(prev => ({
      ...prev,
      [index]: { ...(prev[index] || {}), query: queryText, loading: true, error: '' }
    }));

    try {
      const res = await fetch('/api/agents/crag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: queryText,
          courseId: courseId || ''
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'CRAG search failed');
      }

      const data = await res.json();
      setCragStates(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          loading: false,
          answer: data.answer,
          webSearchUsed: data.webSearchUsed,
          documentsUsed: data.documentsUsed,
        }
      }));
    } catch (err: any) {
      setCragStates(prev => ({
        ...prev,
        [index]: { ...prev[index], loading: false, error: err.message || 'CRAG error' }
      }));
    }
  };

  const handleSelectRetryOption = (index: number, option: string) => {
    setRemediations(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        selectedRetryOption: option,
        retrySubmitted: true
      }
    }));
  };

  const wrongCount = questions.filter(q => !q.isCorrect).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Quiz Overview Header */}
      <Card className="text-center py-6 border border-orange-200/80 shadow-lg shadow-orange-500/5 bg-gradient-to-b from-orange-50/40 to-white">
        <CardHeader>
          <CardTitle className="text-3xl font-mono font-black flex items-center justify-center gap-3 text-stone-900">
            <Trophy className={score >= 80 ? "text-orange-500 fill-orange-500/20 animate-bounce" : "text-stone-400"} size={36} />
            QUIZ COMPLETE!
          </CardTitle>
          <CardDescription className="text-sm font-mono text-stone-600 mt-1">
            TOPIC: <span className="font-bold text-orange-600">{topic}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm">
              <p className="text-[11px] font-mono font-bold text-stone-400 uppercase tracking-wider">Score</p>
              <p className={`text-3xl font-mono font-black mt-1 ${score >= 80 ? 'text-emerald-600' : 'text-orange-600'}`}>
                {score}%
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm">
              <p className="text-[11px] font-mono font-bold text-stone-400 uppercase tracking-wider">Accuracy</p>
              <p className="text-3xl font-mono font-black text-stone-900 mt-1">
                {questions.length - wrongCount}/{questions.length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm">
              <p className="text-[11px] font-mono font-bold text-stone-400 uppercase tracking-wider">Time Taken</p>
              <p className="text-lg font-mono font-bold flex items-center justify-center gap-1.5 text-stone-700 mt-2">
                <Clock size={16} className="text-orange-500" />
                {formatTime(timeTaken)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 flex-wrap pt-2">
            {onRetry && (
              <Button 
                onClick={onRetry}
                className="gap-2 font-mono font-bold bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/25"
              >
                <RefreshCw size={16} />
                Try Another Quiz
              </Button>
            )}
            {onBack && (
              <Button 
                onClick={onBack}
                variant="outline"
                className="gap-2 font-mono font-bold border-orange-200 text-stone-700 hover:bg-orange-50"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Global AI Remediation Notice if mistakes were made */}
      {wrongCount > 0 && (
        <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border border-orange-300 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-md shadow-orange-500/30">
              <Sparkles size={24} />
            </div>
            <div>
              <h4 className="font-mono font-bold text-lg text-stone-900 flex items-center gap-2">
                LANGGRAPH AI MISCONCEPTION DIAGNOSIS ACTIVE
              </h4>
              <p className="text-sm font-sans text-stone-600 mt-1 leading-relaxed">
                You missed {wrongCount} question{wrongCount > 1 ? 's' : ''}. Click the <strong className="font-mono font-bold text-orange-600">"AI Misconception Remediation"</strong> button on any incorrect question below for custom diagnostic analysis, a 3-bullet micro-lesson, and an adaptive retry problem!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Question Breakdown */}
      <div className="space-y-6">
        <h3 className="text-xl font-mono font-bold flex items-center justify-between text-stone-900">
          <span>QUESTION BREAKDOWN</span>
          <span className="text-xs bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-mono font-bold border border-orange-200">
            {questions.length} QUESTIONS
          </span>
        </h3>

        {questions.map((q, idx) => {
          const rem = remediations[idx];
          const crag = cragStates[idx];

          return (
            <Card key={idx} className={`border-l-4 shadow-md transition-all ${q.isCorrect ? 'border-l-emerald-500' : 'border-l-orange-500'}`}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="mt-1 flex-shrink-0">
                    {q.isCorrect ? (
                      <CheckCircle className="text-emerald-500" size={24} />
                    ) : (
                      <XCircle className="text-orange-500" size={24} />
                    )}
                  </div>

                  <div className="flex-1 space-y-3.5">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-semibold text-base text-stone-900 leading-snug">
                        <span className="font-mono font-bold text-orange-600 mr-2">Q{idx + 1}.</span>
                        {q.questionText}
                      </p>
                      <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                        q.isCorrect 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-orange-50 text-orange-700 border-orange-200'
                      }`}>
                        {q.isCorrect ? 'CORRECT' : 'INCORRECT'}
                      </span>
                    </div>

                    {/* Multiple Choice Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      {q.options.map((opt, i) => {
                        let optionClass = "p-3 rounded-xl border text-sm font-medium transition-all ";

                        if (opt === q.correctAnswer) {
                          optionClass += "bg-emerald-50/80 border-emerald-400 text-emerald-900 font-semibold shadow-sm";
                        } else if (opt === q.userAnswer && !q.isCorrect) {
                          optionClass += "bg-orange-50/80 border-orange-400 text-orange-900 font-semibold shadow-sm";
                        } else {
                          optionClass += "bg-stone-50 border-stone-200 text-stone-700";
                        }

                        return (
                          <div key={i} className={optionClass}>
                            <div className="flex items-center justify-between">
                              <span>{opt}</span>
                              {opt === q.correctAnswer && <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md">Correct Choice</span>}
                              {opt === q.userAnswer && !q.isCorrect && <span className="text-[10px] font-mono font-bold bg-orange-200 text-orange-900 px-2 py-0.5 rounded-md">Your Answer</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Standard Explanation if present */}
                    {q.explanation && (
                      <div className="p-4 bg-orange-50/60 border border-orange-200 text-stone-800 rounded-xl text-sm leading-relaxed">
                        <strong className="font-mono font-bold text-orange-700">EXPLANATION:</strong> {q.explanation}
                      </div>
                    )}

                    {/* Agent Buttons Row */}
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleRemediate(idx, q)}
                        disabled={rem?.loading}
                        className="gap-2 font-mono font-bold bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm shadow-orange-500/20"
                      >
                        {rem?.loading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            LangGraph Diagnosing...
                          </>
                        ) : (
                          <>
                            <Brain size={16} />
                            {rem?.misconception ? 'Re-run AI Remediation' : 'AI Misconception Remediation'}
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCRAGQuery(idx)}
                        disabled={crag?.loading}
                        className="gap-2 font-mono font-bold border-orange-200 text-stone-700 hover:bg-orange-50"
                      >
                        {crag?.loading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            CRAG Searching...
                          </>
                        ) : (
                          <>
                            <Globe size={16} />
                            Ask AI Tutor (CRAG Agent)
                          </>
                        )}
                      </Button>
                    </div>

                    {/* 1. LangGraph Quiz Remediation Output Card */}
                    {rem && (
                      <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50/40 p-5 space-y-4 animate-fadeIn">
                        <div className="flex items-center gap-2 text-stone-900 font-mono font-bold border-b border-orange-200/80 pb-2">
                          <Brain size={20} className="text-orange-500" />
                          <span>LANGGRAPH REMEDIATION DIAGNOSIS</span>
                        </div>

                        {rem.error && (
                          <p className="text-sm font-mono text-red-600">{rem.error}</p>
                        )}

                        {rem.misconception && (
                          <div className="space-y-3">
                            <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm">
                              <h5 className="text-[11px] font-mono font-bold uppercase tracking-wider text-orange-600 mb-1">Identified Misconception</h5>
                              <p className="text-sm text-stone-800 font-medium">{rem.misconception}</p>
                            </div>

                            {rem.microLesson && (
                              <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm">
                                <h5 className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-900 mb-2 flex items-center gap-1.5">
                                  <BookOpen size={14} className="text-orange-500" />
                                  Targeted Micro-Lesson
                                </h5>
                                <div className="text-sm text-stone-700 whitespace-pre-line leading-relaxed font-sans">
                                  {rem.microLesson}
                                </div>
                              </div>
                            )}

                            {/* Adaptive Retest Question */}
                            {rem.retryQuestion && (
                              <div className="bg-white p-4 rounded-xl border border-orange-300 shadow-md space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-mono font-bold bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full border border-orange-200">
                                    Adaptive Retest Question
                                  </span>
                                </div>
                                <p className="font-semibold text-sm text-stone-900">
                                  {rem.retryQuestion.questionText}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {rem.retryQuestion.options.map((optionText, oIdx) => {
                                    const isSelected = rem.selectedRetryOption === optionText;
                                    const isCorrectOpt = optionText === rem.retryQuestion?.correctAnswer;
                                    
                                    let btnStyle = "p-2.5 rounded-lg border text-left text-xs font-medium transition-all ";
                                    if (rem.retrySubmitted) {
                                      if (isCorrectOpt) {
                                        btnStyle += "bg-emerald-100 border-emerald-500 text-emerald-900 font-semibold";
                                      } else if (isSelected && !isCorrectOpt) {
                                        btnStyle += "bg-orange-100 border-orange-500 text-orange-900";
                                      } else {
                                        btnStyle += "bg-stone-50 border-stone-200 text-stone-400 opacity-60";
                                      }
                                    } else {
                                      btnStyle += "bg-stone-50 hover:bg-orange-50 border-stone-200 hover:border-orange-300 text-stone-800";
                                    }

                                    return (
                                      <button
                                        key={oIdx}
                                        disabled={rem.retrySubmitted}
                                        onClick={() => handleSelectRetryOption(idx, optionText)}
                                        className={btnStyle}
                                      >
                                        {optionText}
                                      </button>
                                    );
                                  })}
                                </div>

                                {rem.retrySubmitted && (
                                  <div className={`p-3 rounded-xl text-xs font-medium mt-2 ${
                                    rem.selectedRetryOption === rem.retryQuestion.correctAnswer
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                      : 'bg-orange-50 text-orange-800 border border-orange-300'
                                  }`}>
                                    <div className="font-mono font-bold mb-1">
                                      {rem.selectedRetryOption === rem.retryQuestion.correctAnswer ? '🎉 Correct! Misconception Mastered.' : '❌ Incorrect.'}
                                    </div>
                                    <div className="font-sans leading-relaxed">{rem.retryQuestion.explanation}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. CRAG (Corrective RAG) Output Card */}
                    {crag && (
                      <div className="mt-4 rounded-2xl border border-orange-200 bg-white p-5 space-y-3 shadow-md animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-orange-100 pb-2">
                          <div className="flex items-center gap-2 text-stone-900 font-mono font-bold">
                            <Globe size={18} className="text-orange-500" />
                            <span>CORRECTIVE RAG (CRAG) AGENT RESPONSE</span>
                          </div>
                          {crag.webSearchUsed !== undefined && (
                            <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border ${
                              crag.webSearchUsed
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {crag.webSearchUsed ? <Globe size={12} /> : <FileText size={12} />}
                              {crag.webSearchUsed ? 'Tavily Web Search Used' : `Vector DB Context (${crag.documentsUsed} docs)`}
                            </span>
                          )}
                        </div>

                        {crag.error && (
                          <p className="text-sm font-mono text-red-600">{crag.error}</p>
                        )}

                        {crag.answer && (
                          <div className="bg-stone-50 p-4 rounded-xl border border-orange-100 text-sm text-stone-800 whitespace-pre-line leading-relaxed font-sans">
                            {crag.answer}
                          </div>
                        )}

                        {/* Interactive CRAG follow-up input */}
                        <div className="flex items-center gap-2 pt-2">
                          <input
                            type="text"
                            placeholder="Ask CRAG follow-up question..."
                            value={crag.query || ''}
                            onChange={(e) => setCragStates(prev => ({
                              ...prev,
                              [idx]: { ...(prev[idx] || {}), query: e.target.value }
                            }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCRAGQuery(idx, crag.query);
                            }}
                            className="flex-1 text-xs p-2.5 rounded-xl border border-orange-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleCRAGQuery(idx, crag.query)}
                            disabled={crag.loading || !crag.query}
                            className="gap-1 font-mono font-bold bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            <Send size={12} />
                            Ask
                          </Button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
