'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Plus, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export function QuizDashboardClient({ courses }: { courses: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialCourseId = searchParams.get('courseId') || '';
  const initialTopic = searchParams.get('topic') || '';
  
  const [isOpen, setIsOpen] = useState(!!initialCourseId || !!initialTopic);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(initialCourseId);
  const [topic, setTopic] = useState(initialTopic);
  const [error, setError] = useState('');

  // Auto-open modal and pre-fill if params exist
  useEffect(() => {
    if (initialCourseId || initialTopic) {
      setIsOpen(true);
      if (initialCourseId) setSelectedCourse(initialCourseId);
      if (initialTopic) setTopic(initialTopic);
    }
  }, [initialCourseId, initialTopic]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !topic) {
      setError('Please select a course and enter a topic.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse,
          topic,
          count: 5
        })
      });

      if (!res.ok) {
        throw new Error('Failed to generate quiz');
      }

      const data = await res.json();
      
      // Store the generated quiz in sessionStorage to pass it to the quiz taking page
      sessionStorage.setItem('pendingQuiz', JSON.stringify({
        courseId: selectedCourse,
        topic,
        quiz: data.quiz
      }));

      // Navigate to a "new" quiz route (we can use a special ID like 'new' to represent unsaved quiz)
      router.push(`/quiz/new`);
      
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus size={16} />
        Generate Quiz
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md shadow-xl relative">
            <h2 className="text-xl font-bold mb-4">Generate New Quiz</h2>
            
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Course Context</label>
                <select 
                  className="w-full p-2 rounded-md border dark:bg-slate-800 dark:border-slate-700"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">-- Select a Course --</option>
                  {courses.map(c => (
                    <option key={c._id.toString()} value={c._id.toString()}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  The AI will use uploaded materials from this course to generate questions.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Specific Topic</label>
                <input 
                  type="text" 
                  placeholder="e.g., React Hooks, Thermodynamics"
                  className="w-full p-2 rounded-md border dark:bg-slate-800 dark:border-slate-700"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex justify-end gap-3 mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    'Generate 5 Questions'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
