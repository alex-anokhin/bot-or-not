# Bot or Not - Game Design Document

## Core Concept
**Players:** 4-8 total (3-7 humans + 1 AI)  
**Objective:** Social deduction game where humans try to identify and eliminate the AI before it reaches the final 2 players.

### Player Count Analysis

**Minimum: 4 players (3H + 1AI)**
- **Pros:** Fast games, easier lobbies, good for testing
- **Cons:** Very short (max 2 rounds), limited discussion, easier for AI to hide
- **Verdict:** Good for MVP testing, casual quick games

**Sweet Spot: 5-6 players (4-5H + 1AI)**
- **Pros:** 3-4 rounds of gameplay, enough variety in responses, manageable discussion
- **Cons:** Still relatively short games
- **Verdict:** Ideal for MVP launch

**Maximum: 8 players (7H + 1AI)**
- **Pros:** 6+ rounds, rich discussion, harder for AI to blend, more strategic depth
- **Cons:** Longer lobby wait times, potential chaos in voting phase, harder moderation
- **Verdict:** Good for engaged player groups, post-MVP feature

## Win Conditions
- **Humans win:** AI is eliminated at any point
- **AI wins:** Survives to final 2 players

## Game Flow

### Round Structure (2 minutes total)
Each round consists of two phases:

**Phase 1: Response (60s)**
- All players see the same prompt (e.g., "You're a ghost haunting your workplace. What do you do first?")
- Players submit responses privately (140-180 character limit)
- Responses are hidden until everyone submits or timer expires

**Phase 2: Vote (60s)**
- All responses revealed simultaneously
- Players vote to either:
  - **Kick** one suspicious player, OR
  - **Trust** one player (gives protection from elimination)
- Most voted player is eliminated (tie = random elimination)

### Elimination & Progression
- Eliminated players become spectators
- Game continues until AI is kicked (humans win) or only 2 players remain (AI wins)
- New prompt each round for surviving players

## AI Implementation

### AI Prompt Template
```
You are playing a social deduction game with 5 humans. Your goal is to blend in.

Prompt: "[CURRENT_PROMPT]"

Other responses:
- Player 1: "[RESPONSE_1]"
- Player 2: "[RESPONSE_2]"
[...]

Generate a human-like response (140-180 chars). Be funny but not too clever.
```

### AI Behavior Goals
- Generate believable, human-like responses
- Avoid being too witty or perfect
- Match the tone/style of other players

## Technical Requirements (MVP)

### Core Features
- [ ] Room creation/joining (6 players max)
- [ ] Real-time prompt distribution
- [ ] Private response submission
- [ ] Simultaneous response reveal
- [ ] Voting system (kick/trust)
- [ ] Player elimination logic
- [ ] Win condition detection
- [ ] AI response generation (OpenAI API)

### UI Components
- Lobby/waiting room
- Game board showing players
- Prompt display
- Response input (with character counter)
- Response reveal screen
- Voting interface
- Game result screen

### Data Structure
```typescript
interface GameState {
  players: Player[]
  currentRound: number
  phase: 'response' | 'vote' | 'results'
  prompt: string
  responses: Response[]
  votes: Vote[]
  aiPlayerId: string
}
```

## Stretch Features (Post-MVP)
- Voice/text chat during voting phase
- Emoji reactions to responses
- "Suspicion meter" showing community votes
- Custom prompt categories
- Spectator mode improvements
- Player statistics/history

## Technical Stack Recommendations
- **Backend:** FastAPI + WebSockets for real-time updates
- **Frontend:** Next.js + React for responsive UI
- **AI:** OpenAI API for response generation
- **Database:** Simple in-memory for MVP (Redis/PostgreSQL for production)

## MVP Development Priority
1. Basic room/lobby system
2. Turn-based game flow (response → reveal → vote)
3. AI integration with simple prompts
4. Win/lose conditions
5. Basic UI polish
6. Testing with 6 concurrent users