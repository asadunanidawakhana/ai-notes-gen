
export interface Summary {
  short: string;
  medium: string;
  long: string;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export type GeneratedContentType = 'summary' | 'flashcards' | 'quiz';

export interface HistoryItem {
  id: string;
  timestamp: string;
  type: GeneratedContentType;
  content: Summary | Flashcard[] | QuizQuestion[];
  sourceText: string;
}
