'use client';

import { FeedbackCard } from './FeedbackCard';

// Example usage of FeedbackCard component
export function FeedbackCardExample() {
  const sampleFeedbackData = {
    isCorrect: false,
    score: 6,
    feedback: "Your sentence structure is good, but there are some word choice improvements that could make your expression more natural. The grammar is mostly correct, but consider using more idiomatic expressions.",
    collocations: [
      "make progress",
      "take action",
      "pay attention",
      "draw conclusions"
    ],
    phrasalVerbs: [
      "look into",
      "figure out",
      "come across",
      "bring up"
    ],
    word: "progress"
  };

  const handleContinue = () => {
    console.log('Continue clicked');
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">FeedbackCard Example</h1>
      <FeedbackCard 
        feedbackData={sampleFeedbackData}
        onContinue={handleContinue}
      />
    </div>
  );
}
