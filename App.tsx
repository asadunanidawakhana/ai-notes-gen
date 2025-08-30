import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateSummary, generateFlashcards, generateQuiz } from './services/geminiService.ts';
import type { Summary, Flashcard, QuizQuestion, GeneratedContentType, HistoryItem } from './types.ts';
import { LOCAL_STORAGE_KEY } from './constants.ts';
import { SunIcon, MoonIcon, HistoryIcon, FileTextIcon, WandIcon } from './components/Icons.tsx';
import GlassCard from './components/GlassCard.tsx';
import Loader from './components/Loader.tsx';
import FlashcardComponent from './components/Flashcard.tsx';
import HistoryModal from './components/HistoryModal.tsx';

type ActiveView = 'summary' | 'flashcards' | 'quiz' | 'start';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('start');

  const [summary, setSummary] = useState<Summary | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  
  const [selectedSummaryLength, setSelectedSummaryLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [revealedAnswers, setRevealedAnswers] = useState<number[]>([]);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    const darkMode = savedMode ? JSON.parse(savedMode) : true;
    setIsDarkMode(darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    }

    try {
      const savedHistory = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch(e) {
      console.error("Failed to parse history from localStorage", e);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      localStorage.setItem('darkMode', JSON.stringify(newMode));
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return newMode;
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setInputText(text);
      };
      reader.readAsText(file);
    } else if (file) {
        alert("Please upload a .txt file.");
    }
  };

  const addToHistory = (type: GeneratedContentType, content: Summary | Flashcard[] | QuizQuestion[], sourceText: string) => {
    const newItem: HistoryItem = {
      id: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      type,
      content,
      sourceText,
    };
    setHistory(prev => {
      const updatedHistory = [newItem, ...prev].slice(0, 10); // Keep last 10 items
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  };

  const handleGenerate = useCallback(async (type: GeneratedContentType) => {
    if (!inputText.trim()) {
      setError("Please enter some text or upload a file.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setRevealedAnswers([]);

    try {
      let result;
      if (type === 'summary') {
        result = await generateSummary(inputText);
        setSummary(result);
        addToHistory('summary', result, inputText);
      } else if (type === 'flashcards') {
        result = await generateFlashcards(inputText);
        setFlashcards(result);
        addToHistory('flashcards', result, inputText);
      } else if (type === 'quiz') {
        result = await generateQuiz(inputText);
        setQuiz(result);
        addToHistory('quiz', result, inputText);
      }
      setActiveView(type);
    } catch (e: any) {
      setError(e.message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [inputText]);

  const loadFromHistory = (item: HistoryItem) => {
    setInputText(item.sourceText);
    if(item.type === 'summary') setSummary(item.content as Summary);
    if(item.type === 'flashcards') setFlashcards(item.content as Flashcard[]);
    if(item.type === 'quiz') setQuiz(item.content as QuizQuestion[]);
    setActiveView(item.type);
    setIsHistoryOpen(false);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }

  const renderContent = () => {
    if (isLoading) return <Loader />;
    if (error && activeView === 'start') return <div className="text-red-400 text-center p-4">{error}</div>;
    
    switch (activeView) {
      case 'start':
        return (
          <div className="text-center p-8 text-white/70">
            <WandIcon className="w-24 h-24 mx-auto mb-4 opacity-30"/>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to your AI Study Assistant</h2>
            <p>Paste your notes or upload a file to automatically generate summaries, flashcards, and quizzes. Learn smarter, not harder.</p>
          </div>
        );
      case 'summary':
        return summary && (
          <div className="p-6 text-white">
            <h2 className="text-2xl font-bold mb-4">Generated Summary</h2>
            <div className="flex space-x-2 mb-4">
              {(['short', 'medium', 'long'] as const).map(len => (
                <button
                  key={len}
                  onClick={() => setSelectedSummaryLength(len)}
                  className={`px-4 py-2 rounded-lg transition-colors capitalize ${selectedSummaryLength === len ? 'bg-brand-pink text-white' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  {len}
                </button>
              ))}
            </div>
            <div className="prose prose-invert max-w-none text-white/90 whitespace-pre-wrap">{summary[selectedSummaryLength]}</div>
          </div>
        );
      case 'flashcards':
        return (
          <div className="p-6">
             <h2 className="text-2xl font-bold mb-4 text-white">Generated Flashcards</h2>
             <p className="text-white/70 mb-4">Click on a card to flip it and reveal the answer.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flashcards.map((card, index) => <FlashcardComponent key={index} card={card} />)}
            </div>
          </div>
        );
      case 'quiz':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-white">Generated Quiz</h2>
            <div className="space-y-6">
              {quiz.map((q, index) => (
                <div key={index}>
                  <p className="font-semibold text-white/90 mb-2">{index + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((option, i) => {
                      const isCorrect = option === q.correctAnswer;
                      const isRevealed = revealedAnswers.includes(index);
                      let bgColor = 'bg-white/10 hover:bg-white/20';
                      if(isRevealed){
                         bgColor = isCorrect ? 'bg-green-500/50' : 'bg-red-500/50';
                      }

                      return (
                        <button key={i} onClick={() => setRevealedAnswers(prev => [...prev, index])} 
                          className={`w-full text-left p-3 rounded-lg transition-colors text-white ${bgColor}`}>
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-slate-200 dark:bg-gradient-to-br from-[#1a102c] to-[#2a1a4c] font-sans">
      <header className="flex justify-between items-center mb-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-pink to-brand-purple dark:text-white">AI Note Summarizer</h1>
        <div className="flex items-center space-x-4">
          <button onClick={() => setIsHistoryOpen(true)} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-white">
            <HistoryIcon className="w-6 h-6"/>
          </button>
          <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-white">
            {isDarkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
          </button>
        </div>
      </header>

      <main className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
        <GlassCard className="lg:col-span-1 flex flex-col">
            <textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if(error) setError(null);
                }}
                placeholder="Paste your lecture notes, article text, or study material here..."
                className="w-full h-full min-h-[300px] flex-grow p-4 bg-transparent text-white placeholder-white/50 rounded-t-2xl focus:outline-none resize-none"
            />
            <div className="p-4 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <FileTextIcon className="w-5 h-5" />
                  Upload .txt
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt" className="hidden" />
                <div className="flex items-center gap-2">
                    <button onClick={() => handleGenerate('summary')} className="px-4 py-2 rounded-lg bg-brand-purple hover:bg-brand-purple/80 text-white font-semibold transition-colors">Summarize</button>
                    <button onClick={() => handleGenerate('flashcards')} className="px-4 py-2 rounded-lg bg-brand-purple hover:bg-brand-purple/80 text-white font-semibold transition-colors">Flashcards</button>
                    <button onClick={() => handleGenerate('quiz')} className="px-4 py-2 rounded-lg bg-brand-purple hover:bg-brand-purple/80 text-white font-semibold transition-colors">Quiz</button>
                </div>
            </div>
        </GlassCard>

        <GlassCard className="lg:col-span-1 min-h-[400px]">
            <div className="h-full overflow-y-auto">
                {renderContent()}
            </div>
        </GlassCard>
      </main>

      {isHistoryOpen && <HistoryModal history={history} onClose={() => setIsHistoryOpen(false)} onLoad={loadFromHistory} onClear={clearHistory} />}
    </div>
  );
};

export default App;