'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { CheckCircle, XCircle, Clock, Trophy, Sparkles, Brain, BookOpen, RefreshCw, Globe, FileText, Send, HelpCircle, Loader2 } from 'lucide-react';
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
      <Card className="text-center py-6 border border-slate-200 dark:border-slate-800 shadow-md">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <Trophy className={score >= 80 ? "text-yellow-500" : "text-slate-400"} size={32} />
            Quiz Complete!
          </CardTitle>
          <CardDescription className="text-base">
            Topic: <span className="font-semibold text-foreground">{topic}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-slate-100 dark:bg-slate-800/80 p-4 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Score</p>
              <p className={`text-2xl font-extrabold ${score >= 80 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {score}%
              </p>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800/80 p-4 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Accuracy</p>
              <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                {questions.length - wrongCount}/{questions.length}
              </p>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800/80 p-4 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Time Taken</p>
              <p className="text-lg font-bold flex items-center justify-center gap-1 text-slate-700 dark:text-slate-300 mt-1">
                <Clock size={16} />
                {formatTime(timeTaken)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-center gap-4 flex-wrap">
            {onRetry && (
              <Button 
                onClick={onRetry}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw size={16} />
                Try Another Quiz
              </Button>
            )}
            {onBack && (
              <Button 
                onClick={onBack}
                variant="outline"
                className="gap-2"
              >
                Back to Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Global AI Remediation Notice if mistakes were made */}
      {wrongCount > 0 && (
        <div className="bg-gradient-to-r from-purple-900/20 via-indigo-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg">
              <Sparkles size={24} />
            </div>
            <div>
              <h4 className="font-bold text-lg text-purple-200">LangGraph AI Misconception Diagnosis Active</h4>
              <p className="text-sm text-purple-300/80 mt-1">
                You missed {wrongCount} question{wrongCount > 1 ? 's' : ''}. Use the <strong>"AI Misconception Remediation"</strong> button on any incorrect answer below to get personalized diagnostic feedback, a 3-bullet micro-lesson, and an adaptive retest question!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Question Breakdown */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <span>Question Breakdown</span>
          <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full font-medium">
            {questions.length} Questions
          </span>
        </h3>

        {questions.map((q, idx) => {
          const rem = remediations[idx];
          const crag = cragStates[idx];

          return (
            <Card key={idx} className={`border-l-4 shadow-sm transition-all ${q.isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0">
                    {q.isCorrect ? (
                      <CheckCircle className="text-green-500" size={24} />
                    ) : (
                      <XCircle className="text-red-500" size={24} />
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-semibold text-lg text-foreground">
                        <span className="text-muted-foreground mr-2">Q{idx + 1}.</span>
                        {q.questionText}
                      </p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        q.isCorrect 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                      }`}>
                        {q.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    {/* Multiple Choice Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {q.options.map((opt, i) => {
                        let optionClass = "p-3 rounded-lg border text-sm font-medium transition-all ";

                        if (opt === q.correctAnswer) {
                          optionClass += "bg-green-50 border-green-500 text-green-900 dark:bg-green-950/40 dark:border-green-600 dark:text-green-300 font-semibold";
                        } else if (opt === q.userAnswer && !q.isCorrect) {
                          optionClass += "bg-red-50 border-red-500 text-red-900 dark:bg-red-950/40 dark:border-red-600 dark:text-red-300";
                        } else {
                          optionClass += "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-300";
                        }

                        return (
                          <div key={i} className={optionClass}>
                            <div className="flex items-center justify-between">
                              <span>{opt}</span>
                              {opt === q.correctAnswer && <span className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-100 px-1.5 py-0.5 rounded">Correct Choice</span>}
                              {opt === q.userAnswer && !q.isCorrect && <span className="text-xs bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-100 px-1.5 py-0.5 rounded">Your Answer</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Standard Explanation if present */}
                    {q.explanation && (
                      <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-blue-900 dark:text-blue-200 rounded-lg text-sm">
                        <strong className="font-semibold">Explanation:</strong> {q.explanation}
                      </div>
                    )}

                    {/* Agent Buttons Row */}
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button
                        size="sm"
                        variant={rem?.misconception ? "outline" : "primary"}
                        onClick={() => handleRemediate(idx, q)}
                        disabled={rem?.loading}
                        className="gap-2 bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-600 dark:hover:bg-purple-700"
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
                        className="gap-2 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
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
                      <div className="mt-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 p-5 space-y-4 animate-fadeIn">
                        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold border-b border-purple-200 dark:border-purple-800/50 pb-2">
                          <Brain size={20} />
                          <span>LangGraph Remediation Diagnosis</span>
                        </div>

                        {rem.error && (
                          <p className="text-sm text-red-600 dark:text-red-400">{rem.error}</p>
                        )}

                        {rem.misconception && (
                          <div className="space-y-3">
                            <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-lg border border-purple-100 dark:border-purple-900/40">
                              <h5 className="text-xs uppercase tracking-wider font-bold text-purple-600 dark:text-purple-400 mb-1">Identified Misconception</h5>
                              <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{rem.misconception}</p>
                            </div>

                            {rem.microLesson && (
                              <div className="bg-white dark:bg-slate-900/80 p-3.5 rounded-lg border border-purple-100 dark:border-purple-900/40">
                                <h5 className="text-xs uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1">
                                  <BookOpen size={14} />
                                  Targeted Micro-Lesson
                                </h5>
                                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                                  {rem.microLesson}
                                </div>
                              </div>
                            )}

                            {/* Adaptive Retest Question */}
                            {rem.retryQuestion && (
                              <div className="bg-white dark:bg-slate-900/90 p-4 rounded-lg border border-purple-300 dark:border-purple-800 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded">
                                    Adaptive Retest Question
                                  </span>
                                </div>
                                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                  {rem.retryQuestion.questionText}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {rem.retryQuestion.options.map((optionText, oIdx) => {
                                    const isSelected = rem.selectedRetryOption === optionText;
                                    const isCorrectOpt = optionText === rem.retryQuestion?.correctAnswer;
                                    
                                    let btnStyle = "p-2.5 rounded-lg border text-left text-xs font-medium transition-all ";
                                    if (rem.retrySubmitted) {
                                      if (isCorrectOpt) {
                                        btnStyle += "bg-green-100 border-green-500 text-green-900 dark:bg-green-900/50 dark:text-green-200 font-semibold";
                                      } else if (isSelected && !isCorrectOpt) {
                                        btnStyle += "bg-red-100 border-red-500 text-red-900 dark:bg-red-900/50 dark:text-red-200";
                                      } else {
                                        btnStyle += "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-500 opacity-60";
                                      }
                                    } else {
                                      btnStyle += "bg-slate-50 hover:bg-purple-50 border-slate-200 hover:border-purple-400 dark:bg-slate-800 dark:hover:bg-purple-950/40 dark:border-slate-700";
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
                                  <div className={`p-3 rounded-lg text-xs font-medium mt-2 ${
                                    rem.selectedRetryOption === rem.retryQuestion.correctAnswer
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-300'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-300'
                                  }`}>
                                    <div className="font-bold mb-1">
                                      {rem.selectedRetryOption === rem.retryQuestion.correctAnswer ? '🎉 Correct! Misconception Mastered.' : '❌ Incorrect.'}
                                    </div>
                                    <div>{rem.retryQuestion.explanation}</div>
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
                      <div className="mt-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 p-5 space-y-3 animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-indigo-200 dark:border-indigo-800/50 pb-2">
                          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold">
                            <Globe size={18} />
                            <span>Corrective RAG (CRAG) Agent Response</span>
                          </div>
                          {crag.webSearchUsed !== undefined && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${
                              crag.webSearchUsed
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                            }`}>
                              {crag.webSearchUsed ? <Globe size={12} /> : <FileText size={12} />}
                              {crag.webSearchUsed ? 'Tavily Web Search Used' : `Vector DB Context (${crag.documentsUsed} docs)`}
                            </span>
                          )}
                        </div>

                        {crag.error && (
                          <p className="text-sm text-red-600 dark:text-red-400">{crag.error}</p>
                        )}

                        {crag.answer && (
                          <div className="bg-white dark:bg-slate-900/90 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/40 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
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
                            className="flex-1 text-xs p-2.5 rounded-lg border dark:bg-slate-900 dark:border-slate-800"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleCRAGQuery(idx, crag.query)}
                            disabled={crag.loading || !crag.query}
                            className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
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
