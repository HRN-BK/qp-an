# FeedbackCard Component

The `FeedbackCard` component displays AI feedback for vocabulary exercises, including a score, detailed feedback text, and saveable collocations and phrasal verbs.

## Features

- ✅ **Visual feedback**: Shows ✓ (green) or ✗ (red) based on correctness
- 🏆 **Score badge**: Color-coded score display (0-10 scale)
- 📝 **AI feedback text**: Detailed written feedback from AI
- 💾 **Saveable suggestions**: Collocations and phrasal verbs with save functionality
- 🔄 **Loading states**: Visual feedback during save operations
- ✔️ **Persistent state**: Once saved, buttons show "Saved ✔" state

## Props

### `feedbackData: FeedbackData`

```typescript
interface FeedbackData {
  isCorrect: boolean;      // Whether the answer was correct
  score: number;           // Score from 0-10
  feedback: string;        // AI-generated feedback text
  collocations: string[];  // List of collocation suggestions
  phrasalVerbs: string[];  // List of phrasal verb suggestions
  word: string;           // The base word being studied
}
```

### `onContinue?: () => void`

Optional callback function for the Continue button.

## Usage

```tsx
import { FeedbackCard } from '@/components/FeedbackCard';

const feedbackData = {
  isCorrect: false,
  score: 7,
  feedback: "Your sentence structure is good, but consider using more natural expressions.",
  collocations: ["make progress", "take action"],
  phrasalVerbs: ["look into", "figure out"],
  word: "progress"
};

<FeedbackCard 
  feedbackData={feedbackData}
  onContinue={() => console.log('Continue clicked')}
/>
```

## API Integration

The component automatically calls `/api/vocab/collocation` when users click "Save" on any suggestion. The API expects:

```typescript
{
  collocation: string;     // The collocation/phrasal verb text
  word: string;           // The base word
  type: 'collocation' | 'phrasal_verb'
}
```

## Database Schema

Requires the `saved_collocations` table (see `migrations/create_saved_collocations.sql`):

```sql
CREATE TABLE saved_collocations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    collocation_text TEXT NOT NULL,
    base_word TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'collocation',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, collocation_text, base_word, type)
);
```

## Score Badge Colors

- **Green** (8-10): Excellent performance
- **Yellow** (6-7): Good performance, room for improvement  
- **Red** (0-5): Needs significant improvement

## Save Button States

1. **Idle**: Shows "Save" with save icon
2. **Saving**: Shows "Saving..." with loading spinner
3. **Saved**: Shows "Saved ✔" with check icon (green background)

## Styling

The component uses:
- Tailwind CSS for styling
- Lucide React icons
- shadcn/ui components (Card, Button, Badge)
- Responsive design (mobile-friendly)

## Error Handling

- Network errors: Reverts button state to "Save"
- Duplicate saves: API returns 200 status with "Already saved" message
- Failed saves: Console error logged, button reverts to "Save"
