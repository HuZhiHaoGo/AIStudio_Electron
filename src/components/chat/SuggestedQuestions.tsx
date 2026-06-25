import { Lightbulb } from 'lucide-react';

type SuggestedQuestionsProps = {
  questions?: string[];
  disabled: boolean;
  onSelectQuestion: (question: string) => void;
};

export function SuggestedQuestions({ questions, disabled, onSelectQuestion }: SuggestedQuestionsProps) {
  if (!questions?.length) {
    return null;
  }

  return (
    <div className="suggested-questions" aria-label="推荐追问">
      <div className="suggested-questions-title">
        <Lightbulb size={15} />
        <span>你可以继续问</span>
      </div>
      <div className="suggested-question-list">
        {questions.map((question) => (
          <button
            className="suggested-question"
            key={question}
            type="button"
            disabled={disabled}
            onClick={() => onSelectQuestion(question)}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
