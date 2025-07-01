# useGameSession Hook

The `useGameSession` hook centralizes all game session logic including score tracking, streak management, wrong answer handling, and review queue management.

## Usage

```typescript
import { useGameSession } from '@/hooks';

function StudyComponent({ vocabularies }) {
  const totalVocabularies = vocabularies.length;
  const { state, actions } = useGameSession(totalVocabularies);

  // Submit an answer
  const handleSubmit = async () => {
    const answer = state.selectedAnswer || state.userInput;
    const result = await actions.submit(answer, currentVocab, state.mode);
    
    console.log('Result:', result.isCorrect);
    console.log('Mastery change:', result.masteryChange);
  };

  // Go to next question
  const handleNext = () => {
    actions.next();
  };

  // Reset the game
  const handleReset = () => {
    actions.reset();
  };

  return (
    <div>
      <p>Score: {state.score}</p>
      <p>Streak: {state.streak}</p>
      <p>Progress: {state.currentIndex + 1} / {totalVocabularies}</p>
      {state.reviewQueue.length > 0 && (
        <p>Review items: {state.reviewQueue.length}</p>
      )}
      
      {state.isComplete ? (
        <div>Game Complete!</div>
      ) : (
        <div>
          {/* Your game UI here */}
          <button onClick={handleSubmit}>Submit</button>
          <button onClick={handleNext}>Next</button>
          <button onClick={handleReset}>Reset</button>
        </div>
      )}
    </div>
  );
}
```

## State Properties

- `currentIndex: number` - Current question index
- `mode: GameMode` - Current game mode ('listening' | 'translation' | 'synonym' | 'fill_blank')
- `score: number` - Current score (10 points per correct answer)
- `streak: number` - Current correct answer streak
- `results: GameResult[]` - Array of all game results
- `showResult: boolean` - Whether to show the result card
- `selectedAnswer: string` - Currently selected answer for multiple choice questions
- `userInput: string` - User input for text-based questions
- `startTime: number` - Timestamp when current question started
- `reviewQueue: ReviewQueueItem[]` - Queue of items to review (incorrect answers)
- `consecutiveIncorrectMap: Map<number, number>` - Tracks consecutive incorrect answers per vocabulary
- `gameSessionId: string` - Unique session identifier
- `isComplete: boolean` - Whether the game session is complete

## Actions

### `submit(answer: string, vocabulary: Vocabulary, mode: GameMode)`
Submits an answer and updates the game state. Returns a promise with:
- `result: GameResult` - The result object
- `correctAnswer: string` - The correct answer
- `masteryChange: number` - How much the mastery level changed
- `isCorrect: boolean` - Whether the answer was correct

### `next()`
Advances to the next question. Automatically handles:
- Moving to next vocabulary if no review items
- Processing review queue items first
- Marking game as complete when finished

### `reset()`
Resets all game state to initial values.

### Additional Actions
- `setMode(mode: GameMode)` - Set the current game mode
- `setShowResult(show: boolean)` - Control result display
- `setSelectedAnswer(answer: string)` - Set selected answer for multiple choice
- `setUserInput(input: string)` - Set user input for text questions
- `setStartTime(time: number)` - Set question start time
- `addToReviewQueue(vocab: Vocabulary, mode: GameMode)` - Manually add item to review queue

## Game Logic

### Scoring
- Correct answers: +10 points
- Incorrect answers: 0 points

### Streak Management
- Increments on correct answers
- Resets to 0 on incorrect answers

### Review Queue
- Incorrect answers are automatically added to review queue
- Items are inserted 3-10 positions ahead in the queue
- Review items are processed before advancing to new vocabulary

### Consecutive Incorrect Tracking
- Tracks consecutive incorrect attempts per vocabulary
- When a vocabulary reaches 2 consecutive incorrect answers, it triggers mastery level reduction
- Resets to 0 on correct answer

### API Integration
- Automatically calls `/api/vocab/review` on each submission
- Sends session data for analytics
- Handles mastery level updates

## Testing

The hook includes comprehensive tests covering:
- Initial state
- Correct/incorrect answer handling
- Different game modes
- Review queue management
- Consecutive incorrect tracking
- Game completion logic

Run tests with:
```bash
npm test useGameSession
```
