# Spaced-Repetition Integration Implementation

## Overview

This document describes the implementation of spaced-repetition integration for new modes that use AI scoring (1-10 scale) and how it maps to the existing SRS quality system (1-5 scale).

## Changes Made

### 1. Review API Endpoint (`/api/vocab/review`)

**File**: `src/app/api/vocab/review/route.ts`

- Added support for `score` parameter (1-10 scale from AI feedback)
- Implemented mapping from 1-10 scale to 1-5 quality scale: `quality = Math.min(5, Math.ceil(score / 2))`
- Updated review correctness determination based on quality score (>= 3 is correct)
- Enhanced `shouldLowerMastery` rule to work with quality-based scoring
- Pass quality parameter to SRS calculation for enhanced SM2 algorithm

**Mapping Logic**:
- Score 1-2 → Quality 1 (Very Poor)
- Score 3-4 → Quality 2 (Poor) 
- Score 5-6 → Quality 3 (Fair)
- Score 7-8 → Quality 4 (Good)
- Score 9-10 → Quality 5 (Excellent)

### 2. SRS Library Enhancement (`src/lib/srs.ts`)

**Interface Updates**:
- Added optional `quality?: number` parameter to `ReviewInput` interface
- Enhanced `updateMasteryLevel` function to accept quality parameter

**Quality-Enhanced Logic**:
- **Faster Advancement**: Quality >= 4 allows advancement with only 2 consecutive correct answers (vs. 3)
- **Immediate Mastery Lowering**: Quality <= 2 immediately lowers mastery on incorrect answers
- **Backward Compatibility**: All existing functionality preserved when quality is not provided

### 3. StudyGame Component Integration

**File**: `src/components/StudyGame.tsx`

- Updated to pass `aiScore` (1-10) to review API when available from AI feedback modes
- Maintains compatibility with existing scoring systems
- Supports context_write and context_fill modes with AI evaluation

### 4. VocabularyDetailClient Updates

**File**: `src/components/VocabularyDetailClient.tsx`

- Updated manual review to use correct API endpoint and parameters
- Maintains 1-5 rating system for manual reviews

## New Modes Supported

### Context Write Mode
- Users write sentences using vocabulary words
- AI evaluates correctness, grammar, and natural usage
- Scores 1-10 based on quality of usage
- Provides detailed feedback and suggestions

### Context Fill Mode  
- Users complete sentences with appropriate vocabulary words
- AI evaluates word choice and contextual appropriateness
- Scores 1-10 based on accuracy and naturalness
- Includes contextual hints and feedback

## Enhanced SRS Rules

### shouldLowerMastery Integration

The `shouldLowerMastery` rule now works with both traditional consecutive tracking and quality-based scoring:

1. **Traditional Mode**: Mastery lowered when consecutive incorrect reaches 2
2. **Quality Mode**: Mastery lowered immediately for very poor quality (1-2) regardless of consecutive count
3. **Combined**: Both rules can apply - whichever triggers first

### Quality-Based Advancement

- **High Quality (4-5)**: Allows faster progression through mastery levels
- **Medium Quality (3)**: Standard progression rules apply  
- **Low Quality (1-2)**: Immediate mastery lowering on incorrect answers

## Testing

Added comprehensive test coverage in `tests/srs.test.ts`:
- Quality score integration testing
- Enhanced SM2 algorithm verification
- Backward compatibility confirmation
- Edge case handling

## API Usage Examples

### Traditional Review (Existing)
```javascript
POST /api/vocab/review
{
  "vocabularyId": 123,
  "rating": 3,  // 1-5 scale
  "activityType": "flashcard"
}
```

### AI-Enhanced Review (New)
```javascript
POST /api/vocab/review  
{
  "vocabularyId": 123,
  "score": 8,  // 1-10 scale from AI
  "activityType": "context_write",
  "userAnswer": "The weather is extremely cold today."
}
```

### Manual Review
```javascript
POST /api/vocab/review
{
  "vocabularyId": 123, 
  "isCorrect": true,
  "activityType": "manual"
}
```

## Benefits

1. **Enhanced Precision**: 1-10 AI scoring provides more granular feedback than binary correct/incorrect
2. **Adaptive Learning**: Quality-based progression adapts to user performance quality
3. **Immediate Feedback**: Poor quality responses trigger immediate mastery adjustments
4. **Backward Compatibility**: All existing modes continue to work unchanged
5. **Intelligent Progression**: High-quality responses enable faster advancement

## Implementation Status

✅ **Completed**:
- Score to quality mapping (1-10 → 1-5)
- Enhanced SRS algorithm with quality integration
- shouldLowerMastery rule updates
- StudyGame integration for AI modes
- Comprehensive testing
- Documentation

The spaced-repetition integration is now fully functional and ready for production use.
