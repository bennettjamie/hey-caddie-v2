# Voice Commands Reference

All commands are activated by saying **"Hey Caddie"** followed by your command.

## 🎯 Scoring Commands

### Single Score
- "Hey Caddie, I got a birdie"
- "Hey Caddie, Joey got a bogey"
- "Hey Caddie, I scored a par"
- "Hey Caddie, I made an eagle"
- "Hey Caddie, Joey birdie" (simplified)

### Multiple Scores
- "Hey Caddie, I got a bogey, Joey got a birdie"
- "Hey Caddie, I got par, Joey got par, Mike got a birdie"

### Score with Hole Number
- "Hey Caddie, I got a birdie on hole 5"
- "Hey Caddie, Joey got a bogey on hole 3"

### Score Corrections
- "Hey Caddie, change my score to a birdie"
- "Hey Caddie, change Joey's score to par"
- "Hey Caddie, undo" (removes last score)

## 📊 Query Commands

### Leaderboard
- "Hey Caddie, who's winning?"
- "Hey Caddie, who is in the lead?"
- "Hey Caddie, show me the leaderboard"

### Score History
- "Hey Caddie, read back scores for the past 3 holes"
- "Hey Caddie, what were the scores on holes 5 to 7"
- "Hey Caddie, read back scores"

### Personal Score
- "Hey Caddie, what's my score?"
- "Hey Caddie, how am I doing?"
- "Hey Caddie, what is my score"

### Course Information
- "Hey Caddie, what's the par for this hole?"
- "Hey Caddie, what hole are we on?"
- "Hey Caddie, what's the course name?"
- "Hey Caddie, where are we playing?"

## 🏌️ Tee Order Commands

### Query Tee Order
- "Hey Caddie, who's up?"
- "Hey Caddie, who is next?"
- "Hey Caddie, whose turn is it?"
- "Hey Caddie, who goes next?"
- "Hey Caddie, who's teeing?"

### Manage Tee Order
- "Hey Caddie, next player" (advance to next player)
- "Hey Caddie, change tee order to Joey, Mike, and me"
- "Hey Caddie, set order to Joey, Mike, Sarah"

## 🕳️ Hole Navigation

- "Hey Caddie, next hole"
- "Hey Caddie, previous hole"
- "Hey Caddie, go to hole 5"
- "Hey Caddie, jump to hole 10"
- "Hey Caddie, switch to hole 3"

## 💰 Betting Commands

### Fundatory Bets
- "Hey Caddie, I hit the gap"
- "Hey Caddie, Joey hit the gap"
- "Hey Caddie, I missed the gap"
- "Hey Caddie, Joey missed the gap"

### Skins & Nassau
- "Hey Caddie, start skins"
- "Hey Caddie, start skins for 0.50"
- "Hey Caddie, begin nassau"
- "Hey Caddie, show me the bets"
- "Hey Caddie, what are the betting totals?"

## 🎮 Round Management

- "Hey Caddie, start a round at [course] with [players]"
- "Hey Caddie, end round"
- "Hey Caddie, finish round"
- "Hey Caddie, complete round"

## 📝 Score Terms

The app recognizes these score terms:
- **Ace** / **Hole in One** = -2
- **Double Eagle** / **Albatross** = -3
- **Eagle** = -2
- **Birdie** / **Birdy** = -1
- **Par** = 0
- **Bogey** / **Bogie** / **Bogy** = +1
- **Double Bogey** = +2
- **Triple Bogey** = +3
- **Quadruple Bogey** = +4

## 💡 Tips for Best Recognition

1. **Speak clearly** - Enunciate each word
2. **Wait for confirmation** - The app will speak back to confirm
3. **Use natural language** - The app understands variations
4. **Be specific** - Include player names when needed
5. **Check the transcript** - If something goes wrong, check what was heard

## 🔧 Offline Support

The Web Speech API works offline in Chrome/Edge browsers. The app will:
- Continue listening for "Hey Caddie" even when offline
- Process commands locally
- Store scores in localStorage
- Sync to Firebase when connection is restored

## 🎤 Voice Recognition Settings

The app uses:
- **Language**: English (US)
- **Continuous listening**: Enabled for hot word detection
- **Interim results**: Enabled for faster response
- **Offline mode**: Supported in Chrome/Edge

## 🐛 Troubleshooting

### "Hey Caddie" not being detected
- Check microphone permissions
- Speak louder and clearer
- Try "Hey Caddy" (alternative spelling)

### Commands not working
- Check the transcript to see what was heard
- Try rephrasing the command
- Make sure you're in an active round (for scoring commands)

### Scores not recording
- Verify player names match exactly
- Check that you're on the correct hole
- Try manual score input as backup

