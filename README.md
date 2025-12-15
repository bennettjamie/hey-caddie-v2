# Hey Caddie v2

A natural language golf scoring app for disc golf players. Score your rounds using voice commands, manage bets, and track your game history.

## 🎯 Features

### Core Functionality
- **Voice-Activated Scoring**: Say "Hey Caddie" to activate voice commands
- **Natural Language Input**: Record scores like "I got a bogey, Joey got a birdie"
- **Offline Support**: Works offline with local storage persistence
- **Course Management**: Import courses from dgcoursereview.com or create custom courses
- **Location-Based Search**: Find courses near your current location
- **Recently Played**: Quick access to your favorite courses

### Scoring & Gameplay
- **Relative to Par**: Scores recorded as above/below par (-1, 0, +1, etc.)
- **Multiple Layouts**: Support for Red, Blue, Gold tees and custom layouts
- **Custom Par Settings**: Set par for each hole and save to cloud
- **Active Round Tracking**: Real-time score updates and hole navigation

### Betting System
- **MRTZ Currency**: Track bets using "meritz" (proxy for dollars)
- **Fundatory Bets**: Record and track fundatory bets during rounds
- **Skins & Nassau**: Betting types coming soon

### Voice Commands
- "Hey Caddie, start a round at [course] with [players]"
- "Hey Caddie, I got a bogey"
- "Hey Caddie, who's winning?"
- "Hey Caddie, read back scores for the past 3 holes"
- And many more variations

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Firebase account (for cloud storage)
- Modern browser with Web Speech API support

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bennettjamie/hey-caddie-v2.git
   cd hey-caddie-v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Follow the guide in [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
   - Create a Firebase project
   - Enable Firestore Database
   - Enable Authentication (Email/Password, Google, Anonymous)

4. **Configure environment variables**
   - Create `.env.local` in the root directory
   - Add your Firebase configuration:
     ```env
     NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
     NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
     ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Test Firebase connection at [http://localhost:3000/test-firebase](http://localhost:3000/test-firebase)

## 📚 Documentation

- **[Firebase Setup Guide](FIREBASE_SETUP.md)** - Complete Firebase configuration instructions
- **[Course Import Guide](COURSE_IMPORT_GUIDE.md)** - How to import courses from dgcoursereview.com
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Technical details and architecture

## 🎮 Usage

### Starting a Round

1. **Voice Command** (recommended):
   - Say: "Hey Caddie, start a round at [course name] with [player 1], [player 2]"

2. **Manual Selection**:
   - Click "Select Course & Play" on the home page
   - Choose a course and layout
   - Add players
   - Click "Start Round"

### Recording Scores

1. **Voice Input**:
   - Say: "Hey Caddie, I got a birdie"
   - Or: "Hey Caddie, Joey got a bogey, I got par"

2. **Manual Input**:
   - Click "Show Quick Score Input"
   - Tap score buttons for each player

### Querying Scores

- "Hey Caddie, who's winning?"
- "Hey Caddie, read back scores for the past 3 holes"
- "Hey Caddie, what's the score on hole 5?"

## 🛠️ Development

### Project Structure

```
hey-caddie-v2/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Home page
│   ├── admin/             # Admin pages
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── ...
├── context/              # React Context providers
│   ├── GameContext.tsx   # Game state management
│   └── VoiceContext.tsx  # Voice recognition
├── lib/                  # Utility functions
│   ├── firebase.ts       # Firebase initialization
│   ├── courses.ts        # Course CRUD operations
│   └── courseImport.ts   # Course import utilities
├── scripts/              # Server-side scripts
│   └── scrapeCourses.ts  # Web scraping script
├── types/                # TypeScript definitions
└── data/                 # Scraped course data
```

### Key Technologies

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Firebase** - Backend (Firestore, Authentication)
- **Web Speech API** - Voice recognition and synthesis
- **Fuse.js** - Fuzzy search for player names

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npx ts-node scripts/scrapeCourses.ts [ids]` - Scrape courses

## 📦 Importing Courses

### Method 1: Manual JSON Import
1. Go to `/admin/courses`
2. Paste course JSON data
3. Click "Import Courses"

### Method 2: File Upload
1. Create a JSON file with course data
2. Upload via the admin interface

### Method 3: Web Scraping
1. Find course IDs from dgcoursereview.com
2. Run: `npx ts-node scripts/scrapeCourses.ts [courseId1] [courseId2]`
3. Import the generated JSON file

See [COURSE_IMPORT_GUIDE.md](COURSE_IMPORT_GUIDE.md) for detailed instructions.

## 🔒 Security

- Environment variables are excluded from git (`.env.local` in `.gitignore`)
- Firebase security rules protect user data
- Anonymous authentication available for quick access

## 🗺️ Roadmap

- [ ] Tournament mode
- [ ] Score sharing via email/SMS
- [ ] Advanced betting types (Skins, Nassau)
- [ ] Course image uploads
- [ ] Player statistics and history
- [ ] Social features (friends, leaderboards)
- [ ] Mobile app (React Native)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

- Course data sourced from [dgcoursereview.com](https://www.dgcoursereview.com)
- Built with modern web technologies for the disc golf community

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

**Happy Disc Golfing! 🥏⛳**





