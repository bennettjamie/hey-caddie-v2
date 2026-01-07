/**
 * Voice Personality System
 * Provides jokes, encouragement, and personality variations for voice responses
 */

import { STORAGE_KEYS } from './constants';

// ============================================================================
// TYPES
// ============================================================================

export type PersonalityMode = 'casual' | 'professional' | 'funny' | 'encouraging';

export interface PersonalityConfig {
  mode: PersonalityMode;
  rate: number;  // TTS speed (0.1 - 10, 1.0 = normal)
  pitch: number; // TTS pitch (0 - 2, 1.0 = normal)
  volume: number; // TTS volume (0 - 1, 1.0 = max)
}

export interface Joke {
  id: number;
  setup: string;
  punchline: string;
  tags: string[];
}

export interface PlayerScoreData {
  name: string;
  total: number;
  scores: number[];
}

// ============================================================================
// PERSONALITY PRESETS
// ============================================================================

export const PERSONALITY_PRESETS: Record<PersonalityMode, PersonalityConfig> = {
  casual: { mode: 'casual', rate: 1.0, pitch: 1.0, volume: 1.0 },
  professional: { mode: 'professional', rate: 0.9, pitch: 0.95, volume: 1.0 },
  funny: { mode: 'funny', rate: 1.1, pitch: 1.05, volume: 1.0 },
  encouraging: { mode: 'encouraging', rate: 0.95, pitch: 1.1, volume: 1.0 }
};

// ============================================================================
// JOKE DATABASE (100+ Golf Jokes)
// ============================================================================

export const GOLF_JOKES: Joke[] = [
  // Classic Golf Jokes
  {
    id: 1,
    setup: "Why did the golfer bring two pairs of pants?",
    punchline: "In case he got a hole in one!",
    tags: ['classic', 'family-friendly', 'pun']
  },
  {
    id: 2,
    setup: "What's the difference between a bad golfer and a bad skydiver?",
    punchline: "A bad golfer goes 'whack... dang!' A bad skydiver goes 'dang... whack!'",
    tags: ['classic', 'dark-humor']
  },
  {
    id: 3,
    setup: "Why do golfers always carry an extra sock?",
    punchline: "In case they get a hole in one!",
    tags: ['classic', 'pun']
  },
  {
    id: 4,
    setup: "What do you call a lion playing golf?",
    punchline: "A roaring success on the fairway!",
    tags: ['silly', 'family-friendly']
  },
  {
    id: 5,
    setup: "Why did the golfer wear two pairs of socks?",
    punchline: "In case he got a hole in one!",
    tags: ['classic', 'pun']
  },
  {
    id: 6,
    setup: "What's a golfer's favorite letter?",
    punchline: "Tee!",
    tags: ['short', 'pun', 'family-friendly']
  },
  {
    id: 7,
    setup: "Why is golf like taxes?",
    punchline: "You drive hard to get to the green, and then you wind up in the hole!",
    tags: ['clever', 'relatable']
  },
  {
    id: 8,
    setup: "What's the easiest shot in golf?",
    punchline: "Your fourth putt!",
    tags: ['self-deprecating', 'relatable']
  },

  // Disc Golf Specific
  {
    id: 9,
    setup: "Why don't disc golfers ever get lost?",
    punchline: "Because they're always following the chains!",
    tags: ['disc-golf', 'family-friendly']
  },
  {
    id: 10,
    setup: "What's a disc golfer's favorite kind of music?",
    punchline: "Heavy metal... because of all those chains!",
    tags: ['disc-golf', 'pun']
  },
  {
    id: 11,
    setup: "Why did the disc golfer bring a ladder?",
    punchline: "To get to the top of the leaderboard!",
    tags: ['disc-golf', 'silly']
  },
  {
    id: 12,
    setup: "What do you call a disc that always lands in the basket?",
    punchline: "A figment of your imagination!",
    tags: ['disc-golf', 'self-deprecating']
  },
  {
    id: 13,
    setup: "Why are disc golfers great at relationships?",
    punchline: "They're experts at handling chains!",
    tags: ['disc-golf', 'clever']
  },
  {
    id: 14,
    setup: "What's the difference between a disc golfer and a fisherman?",
    punchline: "A fisherman doesn't have to lie about the one that got away... it's still in the lake!",
    tags: ['disc-golf', 'relatable']
  },

  // Score-Related Jokes
  {
    id: 15,
    setup: "What's the difference between a golfer and a skydiver?",
    punchline: "A golfer goes 'plop... oh no!' A skydiver goes 'oh no... plop!'",
    tags: ['classic', 'dark-humor']
  },
  {
    id: 16,
    setup: "Why do golfers hate cake?",
    punchline: "Because they're always afraid of three-putting!",
    tags: ['pun', 'silly']
  },
  {
    id: 17,
    setup: "What do you call an eagle that's afraid of heights?",
    punchline: "A birdie!",
    tags: ['clever', 'score-related']
  },
  {
    id: 18,
    setup: "How many golfers does it take to change a light bulb?",
    punchline: "Fore!",
    tags: ['classic', 'pun']
  },

  // Trees and Obstacles
  {
    id: 19,
    setup: "Why are trees great at disc golf?",
    punchline: "They're always in the fairway when you need them!",
    tags: ['disc-golf', 'relatable', 'trees']
  },
  {
    id: 20,
    setup: "What's a tree's favorite disc golf shot?",
    punchline: "A woody!",
    tags: ['disc-golf', 'pun', 'trees']
  },
  {
    id: 21,
    setup: "Why did the disc hit the tree?",
    punchline: "It wooden't get out of the way!",
    tags: ['disc-golf', 'pun', 'trees']
  },
  {
    id: 22,
    setup: "What do you call a disc golfer who never hits trees?",
    punchline: "A liar!",
    tags: ['disc-golf', 'self-deprecating', 'trees']
  },

  // Weather Jokes
  {
    id: 23,
    setup: "What's a golfer's favorite weather?",
    punchline: "When it's not too hot and not too cold... just par-fect!",
    tags: ['pun', 'weather']
  },
  {
    id: 24,
    setup: "Why do golfers love playing in the rain?",
    punchline: "They don't... but they do it anyway!",
    tags: ['relatable', 'weather']
  },
  {
    id: 25,
    setup: "What did the golfer say when it started raining?",
    punchline: "Well, this is sub-par!",
    tags: ['pun', 'weather']
  },

  // Putting Jokes
  {
    id: 26,
    setup: "What's the difference between a golf ball and a car?",
    punchline: "You can drive a golf ball 300 yards!",
    tags: ['classic', 'silly']
  },
  {
    id: 27,
    setup: "Why did the golfer bring string to the course?",
    punchline: "To tie up the loose ends of his round!",
    tags: ['silly', 'pun']
  },
  {
    id: 28,
    setup: "What's a golfer's least favorite kind of music?",
    punchline: "Swing!",
    tags: ['pun', 'music']
  },

  // Playing Partners
  {
    id: 29,
    setup: "Why don't golfers ever get lonely?",
    punchline: "They're always looking for a fore-some!",
    tags: ['pun', 'social']
  },
  {
    id: 30,
    setup: "What did one golf ball say to the other?",
    punchline: "See you around!",
    tags: ['silly', 'family-friendly']
  },

  // Equipment Jokes
  {
    id: 31,
    setup: "Why did the disc golfer name his putter 'disappointment'?",
    punchline: "Because it never chains out!",
    tags: ['disc-golf', 'self-deprecating']
  },
  {
    id: 32,
    setup: "What's the difference between a poorly thrown disc and a magical spell?",
    punchline: "The spell actually flies straight!",
    tags: ['disc-golf', 'self-deprecating']
  },
  {
    id: 33,
    setup: "Why do disc golfers carry so many discs?",
    punchline: "Because hope floats... and so do discs in water!",
    tags: ['disc-golf', 'relatable']
  },
  {
    id: 34,
    setup: "What do you call a disc that lands exactly where you aimed?",
    punchline: "Lucky!",
    tags: ['disc-golf', 'self-deprecating']
  },

  // More Classic Jokes
  {
    id: 35,
    setup: "Why did the golfer bring a pencil to the course?",
    punchline: "To draw his putts!",
    tags: ['silly', 'pun']
  },
  {
    id: 36,
    setup: "What's a golfer's favorite dance?",
    punchline: "The bogey!",
    tags: ['pun', 'dance']
  },
  {
    id: 37,
    setup: "Why don't golfers tell secrets on the course?",
    punchline: "Because the greens have ears!",
    tags: ['silly', 'pun']
  },
  {
    id: 38,
    setup: "What do you call a snowman playing golf?",
    punchline: "A hole in snow-ne!",
    tags: ['silly', 'pun', 'seasonal']
  },
  {
    id: 39,
    setup: "Why was the golf course so noisy?",
    punchline: "Because everyone was yelling fore!",
    tags: ['silly', 'classic']
  },
  {
    id: 40,
    setup: "What's a golfer's favorite sport?",
    punchline: "Anything but golf when they're playing badly!",
    tags: ['self-deprecating', 'relatable']
  },

  // One-Liners
  {
    id: 41,
    setup: "Golf is a game where the ball always lies poorly and the player well.",
    punchline: "That's not a joke, that's just facts!",
    tags: ['clever', 'relatable']
  },
  {
    id: 42,
    setup: "What's the hardest part about golf?",
    punchline: "The ground!",
    tags: ['silly', 'short']
  },
  {
    id: 43,
    setup: "Why do they call it golf?",
    punchline: "Because all the other four-letter words were taken!",
    tags: ['classic', 'cheeky']
  },
  {
    id: 44,
    setup: "What's a golfer's favorite type of story?",
    punchline: "A hole-in-one!",
    tags: ['pun', 'silly']
  },
  {
    id: 45,
    setup: "Why did the golfer go to the bank?",
    punchline: "To improve his chip!",
    tags: ['pun', 'clever']
  },

  // Course Conditions
  {
    id: 46,
    setup: "What's the best thing about playing a flooded course?",
    punchline: "All the water hazards are easier to see!",
    tags: ['weather', 'clever']
  },
  {
    id: 47,
    setup: "Why do golfers love early morning rounds?",
    punchline: "The course is so beautiful before they ruin it!",
    tags: ['self-deprecating', 'relatable']
  },
  {
    id: 48,
    setup: "What's the difference between a golf course and a ski resort?",
    punchline: "At a ski resort, you're supposed to go downhill fast!",
    tags: ['clever', 'comparative']
  },

  // More Disc Golf Jokes
  {
    id: 49,
    setup: "Why don't disc golfers need maps?",
    punchline: "They're experts at finding the rough!",
    tags: ['disc-golf', 'self-deprecating']
  },
  {
    id: 50,
    setup: "What's a disc golfer's favorite constellation?",
    punchline: "The Big Dipper... for when their disc lands in water!",
    tags: ['disc-golf', 'clever']
  },
  {
    id: 51,
    setup: "Why did the disc cross the road?",
    punchline: "Because the player threw it that way!",
    tags: ['disc-golf', 'silly']
  },
  {
    id: 52,
    setup: "What do you call a disc golfer with a good memory?",
    punchline: "Someone who remembers where they lost all their discs!",
    tags: ['disc-golf', 'relatable']
  },
  {
    id: 53,
    setup: "Why are disc golfers so good at math?",
    punchline: "They're always calculating how many strokes they're over!",
    tags: ['disc-golf', 'self-deprecating']
  },

  // Quick Zingers (50-100)
  {
    id: 54,
    setup: "Golf: the only sport where you can have a beer in one hand and still claim you're exercising!",
    punchline: "Cheers to that!",
    tags: ['relatable', 'cheeky']
  },
  {
    id: 55,
    setup: "What's par?",
    punchline: "That thing I heard about once!",
    tags: ['self-deprecating', 'short']
  },
  {
    id: 56,
    setup: "Why did the golfer quit?",
    punchline: "He lost his drive!",
    tags: ['pun', 'classic']
  },
  {
    id: 57,
    setup: "What's a golfer's favorite bird?",
    punchline: "Any bird that's on their scorecard!",
    tags: ['clever', 'score-related']
  },
  {
    id: 58,
    setup: "Why do golfers always look sad?",
    punchline: "They're constantly under par!",
    tags: ['pun', 'clever']
  },
  {
    id: 59,
    setup: "What's the difference between golf and fishing?",
    punchline: "In fishing, you don't have to chase the fish around a park!",
    tags: ['comparative', 'silly']
  },
  {
    id: 60,
    setup: "Why did the golfer bring a ladder?",
    punchline: "He heard the course had high scores!",
    tags: ['silly', 'pun']
  },
  {
    id: 61,
    setup: "What do you call a priest who plays golf?",
    punchline: "A holy roller!",
    tags: ['pun', 'clever']
  },
  {
    id: 62,
    setup: "Why don't golfers ever win at poker?",
    punchline: "They always show their hand!",
    tags: ['pun', 'clever']
  },
  {
    id: 63,
    setup: "What's a golfer's favorite beverage?",
    punchline: "Tee!",
    tags: ['pun', 'short']
  },
  {
    id: 64,
    setup: "Why did the golfer cross the road?",
    punchline: "His ball went that way!",
    tags: ['silly', 'classic']
  },
  {
    id: 65,
    setup: "What do you call a wizard who plays golf?",
    punchline: "Harry Putter!",
    tags: ['silly', 'pun', 'pop-culture']
  },
  {
    id: 66,
    setup: "Why don't vampires play golf?",
    punchline: "They can't stand the stakes!",
    tags: ['silly', 'pun', 'spooky']
  },
  {
    id: 67,
    setup: "What's a golfer's favorite game show?",
    punchline: "The Birdie Bunch!",
    tags: ['silly', 'pun', 'pop-culture']
  },
  {
    id: 68,
    setup: "Why did the golfer bring an umbrella?",
    punchline: "He heard it was going to be a wet score!",
    tags: ['silly', 'pun']
  },
  {
    id: 69,
    setup: "What's the best part about golfing with your boss?",
    punchline: "You get paid to watch them struggle too!",
    tags: ['relatable', 'work']
  },
  {
    id: 70,
    setup: "Why are golfers bad at secrets?",
    punchline: "They're always putting things out in the open!",
    tags: ['pun', 'clever']
  },
  {
    id: 71,
    setup: "What do you call a golf club that tells jokes?",
    punchline: "A pun wedge!",
    tags: ['pun', 'meta']
  },
  {
    id: 72,
    setup: "Why did the golfer take off his hat?",
    punchline: "He wanted to cap off a good round!",
    tags: ['pun', 'silly']
  },
  {
    id: 73,
    setup: "What's a ghost's favorite golf score?",
    punchline: "Boo-gey!",
    tags: ['pun', 'spooky']
  },
  {
    id: 74,
    setup: "Why do golfers make good detectives?",
    punchline: "They're always investigating the rough!",
    tags: ['pun', 'clever']
  },
  {
    id: 75,
    setup: "What did the golf ball say to the club?",
    punchline: "You drive me crazy!",
    tags: ['pun', 'silly']
  },
  {
    id: 76,
    setup: "Why are golfers great at parties?",
    punchline: "They know how to break the ice... and the course record!",
    tags: ['social', 'pun']
  },
  {
    id: 77,
    setup: "What's a computer's favorite golf score?",
    punchline: "A byte!",
    tags: ['pun', 'nerdy']
  },
  {
    id: 78,
    setup: "Why did the golfer study astronomy?",
    punchline: "To improve his swing plane!",
    tags: ['clever', 'pun']
  },
  {
    id: 79,
    setup: "What do you call a bear playing golf?",
    punchline: "A grizzly on the green!",
    tags: ['silly', 'animals']
  },
  {
    id: 80,
    setup: "Why are golfers good at baking?",
    punchline: "They're experts at making slices!",
    tags: ['pun', 'self-deprecating']
  },
  {
    id: 81,
    setup: "What's a golfer's favorite school subject?",
    punchline: "Geometry... because of all the angles!",
    tags: ['clever', 'pun']
  },
  {
    id: 82,
    setup: "Why did the golfer go to art school?",
    punchline: "To work on his draw!",
    tags: ['pun', 'clever']
  },
  {
    id: 83,
    setup: "What do you call a golfer who's also a musician?",
    punchline: "Someone with perfect pitch!",
    tags: ['pun', 'music']
  },
  {
    id: 84,
    setup: "Why don't golfers use bookmarks?",
    punchline: "They prefer markers!",
    tags: ['pun', 'silly']
  },
  {
    id: 85,
    setup: "What's a golfer's favorite Shakespeare play?",
    punchline: "Much Ado About Putting!",
    tags: ['clever', 'literary']
  },
  {
    id: 86,
    setup: "Why did the golfer become a gardener?",
    punchline: "He was great at finding the rough!",
    tags: ['pun', 'relatable']
  },
  {
    id: 87,
    setup: "What do you call a golf tournament for cats?",
    punchline: "The Purr-fect Round!",
    tags: ['silly', 'animals', 'pun']
  },
  {
    id: 88,
    setup: "Why are golfers good at geography?",
    punchline: "They know all about fairways!",
    tags: ['pun', 'clever']
  },
  {
    id: 89,
    setup: "What's a golfer's favorite candy?",
    punchline: "Fore-une cookies!",
    tags: ['pun', 'silly']
  },
  {
    id: 90,
    setup: "Why did the golfer join the choir?",
    punchline: "To work on his pitch!",
    tags: ['pun', 'music']
  },
  {
    id: 91,
    setup: "What do you call a golfer who never drinks?",
    punchline: "Thirsty!",
    tags: ['cheeky', 'relatable']
  },
  {
    id: 92,
    setup: "Why are disc golfers environmentalists?",
    punchline: "They're always chasing after plastic in the woods!",
    tags: ['disc-golf', 'clever']
  },
  {
    id: 93,
    setup: "What's a disc golfer's favorite game?",
    punchline: "Hide and seek... with their discs!",
    tags: ['disc-golf', 'relatable']
  },
  {
    id: 94,
    setup: "Why did the disc golfer become a meteorologist?",
    punchline: "To predict the wind that'll ruin their shot!",
    tags: ['disc-golf', 'clever']
  },
  {
    id: 95,
    setup: "What do you call a disc that never fades?",
    punchline: "A myth!",
    tags: ['disc-golf', 'self-deprecating']
  },
  {
    id: 96,
    setup: "Why don't disc golfers play chess?",
    punchline: "They can't handle any more trees!",
    tags: ['disc-golf', 'trees', 'pun']
  },
  {
    id: 97,
    setup: "What's the difference between a good throw and a great throw?",
    punchline: "About three trees!",
    tags: ['disc-golf', 'self-deprecating']
  },
  {
    id: 98,
    setup: "Why are disc golfers so patient?",
    punchline: "They spend half their round waiting for people to find their discs!",
    tags: ['disc-golf', 'relatable']
  },
  {
    id: 99,
    setup: "What do you call a disc golfer who always hits the basket?",
    punchline: "Fictional!",
    tags: ['disc-golf', 'self-deprecating']
  },
  {
    id: 100,
    setup: "Why did the disc golfer bring a GPS?",
    punchline: "To find all the places they're NOT supposed to throw!",
    tags: ['disc-golf', 'silly']
  },
  {
    id: 101,
    setup: "What's a disc golfer's motto?",
    punchline: "If at first you don't succeed... it probably hit a tree!",
    tags: ['disc-golf', 'self-deprecating']
  },
  {
    id: 102,
    setup: "Why do disc golfers love physics?",
    punchline: "They're constantly defying the laws of expected trajectories!",
    tags: ['disc-golf', 'clever']
  },
  {
    id: 103,
    setup: "What do you call a perfect round of disc golf?",
    punchline: "Tomorrow's round!",
    tags: ['disc-golf', 'relatable', 'optimistic']
  },
  {
    id: 104,
    setup: "Why are disc golfers great storytellers?",
    punchline: "They're always embellishing their throws!",
    tags: ['disc-golf', 'cheeky']
  },
  {
    id: 105,
    setup: "What's the disc golfer's prayer?",
    punchline: "Please land fair... or at least findable!",
    tags: ['disc-golf', 'relatable']
  }
];

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get current personality mode from localStorage
 */
export function getCurrentPersonalityMode(): PersonalityMode {
  if (typeof window === 'undefined') return 'casual';
  return (localStorage.getItem(STORAGE_KEYS.VOICE_PERSONALITY_MODE) as PersonalityMode) || 'casual';
}

/**
 * Set personality mode
 */
export function setPersonalityMode(mode: PersonalityMode): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.VOICE_PERSONALITY_MODE, mode);
  }
}

/**
 * Get recently told joke IDs from localStorage
 */
function getRecentJokeIds(): number[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEYS.VOICE_JOKE_HISTORY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save recently told joke IDs to localStorage
 */
function saveRecentJokeIds(ids: number[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.VOICE_JOKE_HISTORY, JSON.stringify(ids));
  }
}

/**
 * Get a random joke that hasn't been told recently
 */
export function getRandomJoke(avoidRecent: number = 20): Joke {
  const recentIds = getRecentJokeIds();

  // Filter out recently told jokes
  let availableJokes = GOLF_JOKES.filter(joke => !recentIds.includes(joke.id));

  // If we've told all jokes, reset the history
  if (availableJokes.length === 0) {
    availableJokes = GOLF_JOKES;
    saveRecentJokeIds([]);
  }

  // Pick random joke
  const randomIndex = Math.floor(Math.random() * availableJokes.length);
  const selectedJoke = availableJokes[randomIndex];

  // Update recent history
  const updatedRecent = [selectedJoke.id, ...recentIds].slice(0, avoidRecent);
  saveRecentJokeIds(updatedRecent);

  return selectedJoke;
}

/**
 * Generate encouragement based on score context
 */
export function generateEncouragement(
  score: number, // Relative to par (-2=eagle, -1=birdie, 0=par, 1=bogey, etc.)
  par: number,
  playerName: string,
  trendData?: { last3: number[]; average: number }
): string {
  // Ace (hole-in-one)
  if (score + par === 1) {
    const aceResponses = [
      `ACE! Unbelievable ${playerName}! That's incredible!`,
      `HOLE IN ONE! ${playerName} you're on fire!`,
      `ACE! The chains never stood a chance! Amazing ${playerName}!`,
      `Holy chains ${playerName}! That's an ACE!`
    ];
    return aceResponses[Math.floor(Math.random() * aceResponses.length)];
  }

  // Eagle (-2)
  if (score <= -2) {
    const eagleResponses = [
      `Incredible ${playerName}! That's an eagle!`,
      `Eagle! Outstanding golf ${playerName}!`,
      `Eagle! You're on absolute fire ${playerName}!`,
      `That's an eagle! The rest of the group is taking notes ${playerName}!`,
      `Eagle! Pure golf right there ${playerName}!`
    ];
    return eagleResponses[Math.floor(Math.random() * eagleResponses.length)];
  }

  // Birdie (-1)
  if (score === -1) {
    const birdieResponses = [
      `Birdie! Nice work ${playerName}!`,
      `That's how you do it ${playerName}! Birdie!`,
      `Birdie! Keep it rolling ${playerName}!`,
      `Sweet birdie ${playerName}!`,
      `Birdie! That'll play ${playerName}!`,
      `Nice birdie ${playerName}! Looking good!`
    ];
    return birdieResponses[Math.floor(Math.random() * birdieResponses.length)];
  }

  // Par (0)
  if (score === 0) {
    const parResponses = [
      `Par. Solid golf ${playerName}.`,
      `Right on par ${playerName}.`,
      `Good par save ${playerName}.`,
      `Par. Steady as she goes ${playerName}.`,
      `Par golf ${playerName}. Nice.`
    ];
    return parResponses[Math.floor(Math.random() * parResponses.length)];
  }

  // Bogey (+1)
  if (score === 1) {
    const bogeyResponses = [
      `Bogey. Shake it off ${playerName}, you'll get it back.`,
      `No worries ${playerName}, plenty of holes left.`,
      `Bogey. Stay focused ${playerName}.`,
      `One over ${playerName}. Next hole is yours.`,
      `Bogey. All good ${playerName}, keep grinding.`
    ];
    return bogeyResponses[Math.floor(Math.random() * bogeyResponses.length)];
  }

  // Double bogey or worse (+2+)
  if (score >= 2) {
    const encouragingResponses = [
      `Tough hole ${playerName}. Next one's yours.`,
      `Shake it off ${playerName}. Fresh start on the next tee.`,
      `Don't let it get to you ${playerName}. Move on to the next hole.`,
      `Rough one ${playerName}. You've got this on the next hole.`,
      `That's behind you now ${playerName}. Focus forward.`
    ];
    return encouragingResponses[Math.floor(Math.random() * encouragingResponses.length)];
  }

  return `Score recorded for ${playerName}.`;
}

/**
 * Generate front 9 summary (or any segment)
 */
export function generateFront9Summary(
  playerScores: { [playerId: string]: PlayerScoreData },
  currentPlayerId?: string
): string {
  const summaryParts: string[] = [];

  // Sort by total (lowest first)
  const sorted = Object.values(playerScores).sort((a, b) => a.total - b.total);

  if (sorted.length === 0) {
    return "No scores to summarize yet.";
  }

  summaryParts.push("Here's how things shook out:");

  sorted.forEach((player, index) => {
    const scoreText = player.total === 0
      ? "even par"
      : player.total < 0
        ? `${Math.abs(player.total)} under par`
        : `${player.total} over par`;

    if (index === 0) {
      summaryParts.push(`${player.name} is leading at ${scoreText}.`);
    } else {
      summaryParts.push(`${player.name} is at ${scoreText}.`);
    }
  });

  // Add motivational ending
  if (currentPlayerId) {
    const currentPlayer = playerScores[currentPlayerId];
    if (currentPlayer && sorted[0].name !== currentPlayer.name) {
      const motivationalEndings = [
        "There's still time to make a move!",
        "Plenty of golf left to play!",
        "Next segment is where champions are made!",
        "You've got this! Keep fighting!"
      ];
      summaryParts.push(motivationalEndings[Math.floor(Math.random() * motivationalEndings.length)]);
    } else if (currentPlayer && sorted[0].name === currentPlayer.name) {
      const leadEndings = [
        "Keep it rolling!",
        "Stay focused and finish strong!",
        "You're in control!",
        "Don't let up now!"
      ];
      summaryParts.push(leadEndings[Math.floor(Math.random() * leadEndings.length)]);
    }
  }

  return summaryParts.join(' ');
}

/**
 * Generate overall round summary
 */
export function generateRoundSummary(
  gameState: any,
  requestingPlayerId?: string
): string {
  if (!gameState || !gameState.currentRound) {
    return "No active round to summarize.";
  }

  const round = gameState.currentRound;
  const summaryParts: string[] = [];

  // Calculate totals for all players
  const playerTotals: { [playerId: string]: PlayerScoreData } = {};

  round.players.forEach((player: any) => {
    const scores: number[] = [];
    let total = 0;

    Object.keys(round.scores).forEach((holeNum) => {
      const holeScores = round.scores[holeNum];
      if (holeScores && holeScores[player.id] !== undefined) {
        scores.push(holeScores[player.id]);
        total += holeScores[player.id];
      }
    });

    playerTotals[player.id] = {
      name: player.name,
      total,
      scores
    };
  });

  // Sort by total
  const sorted = Object.entries(playerTotals).sort((a, b) => a[1].total - b[1].total);

  const holesPlayed = Object.keys(round.scores).length;
  summaryParts.push(`After ${holesPlayed} holes:`);

  sorted.forEach(([playerId, data], index) => {
    const scoreText = data.total === 0
      ? "even par"
      : data.total < 0
        ? `${Math.abs(data.total)} under`
        : `${data.total} over`;

    if (index === 0) {
      summaryParts.push(`${data.name} leads at ${scoreText}.`);
    } else {
      const gap = data.total - sorted[0][1].total;
      summaryParts.push(`${data.name} is ${gap} ${gap === 1 ? 'stroke' : 'strokes'} back at ${scoreText}.`);
    }
  });

  // Add context for requesting player if provided
  if (requestingPlayerId && playerTotals[requestingPlayerId]) {
    const playerData = playerTotals[requestingPlayerId];
    const rank = sorted.findIndex(([id]) => id === requestingPlayerId) + 1;

    if (rank === 1) {
      summaryParts.push("You're in the lead. Stay focused!");
    } else {
      summaryParts.push(`You're in ${rank}${getRankSuffix(rank)} place. Keep fighting!`);
    }
  }

  return summaryParts.join(' ');
}

/**
 * Apply personality wrapper to response text
 */
export function applyPersonality(
  response: string,
  context: {
    type: 'leaderboard' | 'scores' | 'betting' | 'course' | 'general';
    mode?: PersonalityMode;
  }
): string {
  const mode = context.mode || getCurrentPersonalityMode();

  // Professional mode - no modification
  if (mode === 'professional') {
    return response;
  }

  // Funny mode - add humorous intros/outros
  if (mode === 'funny') {
    const funnyIntros = [
      "Alright, listen up!",
      "Here's the deal:",
      "Check this out:",
      "You're not gonna believe this:",
      "Okay okay okay,"
    ];
    const funnyOutros = [
      "That's the scoop!",
      "And that's how the disc flies!",
      "Don't shoot the messenger!",
      "You heard it here first!"
    ];

    const intro = funnyIntros[Math.floor(Math.random() * funnyIntros.length)];
    const outro = Math.random() > 0.7 ? funnyOutros[Math.floor(Math.random() * funnyOutros.length)] : '';

    return outro ? `${intro} ${response} ${outro}` : `${intro} ${response}`;
  }

  // Encouraging mode - add motivational endings
  if (mode === 'encouraging') {
    const encouragingEndings = [
      "You've got this!",
      "Keep it up!",
      "Stay positive!",
      "Believe in yourself!",
      "One shot at a time!",
      "Trust the process!"
    ];

    if (Math.random() > 0.5) {
      const ending = encouragingEndings[Math.floor(Math.random() * encouragingEndings.length)];
      return `${response} ${ending}`;
    }
  }

  // Casual mode (default) - return as-is
  return response;
}

/**
 * Helper: Get ordinal suffix for rank (1st, 2nd, 3rd, etc.)
 */
function getRankSuffix(rank: number): string {
  const lastDigit = rank % 10;
  const lastTwoDigits = rank % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return 'th';
  }

  switch (lastDigit) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
