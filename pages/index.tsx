import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Head from 'next/head';

// ---------- TYPE DEFINITIONS ---------- //
interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  verifiedAddresses?: {
    eth_addresses?: string[];
  };
}

interface FarcasterContext {
  user?: FarcasterUser;
}

interface LocalScore {
  username: string;
  score: number;
  level: number;
  timestamp: number;
}

// ---------- ORANGE-THEMED WORDS ---------- //
const ORANGE_WORDS = [
  'orange', 'oranges', 'orangecake', 'orangejuice', 'orangesoda', 'orangesorbet',
  'orangeade', 'orangeades', 'orangeish', 'orangeishness', 'orangeism',
  'orangeisms', 'orangeness', 'orangeries', 'orangery', 'orangewood',
  'orangewoods', 'orangewort', 'peach', 'pumpkin', 'carrot', 'tangerine',
  'tiger', 'tigger', 'garfield', 'goldfish', 'marigold', 'cantaloupe',
  'bellpepper', 'sweetpotato', 'safetyvest', 'trafficcone', 'sunrisesunset'
];

// ---------- GAME CONFIGURATION ---------- //
const MAX_TRIES = 3;
const TIMER_SECONDS = 20;
const POINTS_PER_LEVEL = 10;

// ---------- CONTRACT INFO (FOR DISPLAY ONLY) ---------- //
const CONTRACT_ADDRESS = '0xA52357561265e6Ca8dE400139329D58347106087';

export default function InflynceOrangeGuessGame() {
  // ---------- GAME STATE ---------- //
  const [gameState, setGameState] = useState({
    level: 1,
    score: 0,
    tries: MAX_TRIES,
    timeLeft: TIMER_SECONDS,
    isGameOver: false,
    isPaused: false
  });

  const [currentWord, setCurrentWord] = useState('');
  const [wordHint, setWordHint] = useState('');
  const [userGuess, setUserGuess] = useState('');
  const [gameMessage, setGameMessage] = useState('Welcome to Inflynce Orange Guess Game! 🧡');

  // ---------- FARCASTER STATE ---------- //
  const [farcasterUser, setFarcasterUser] = useState<FarcasterUser | null>(null);
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [localLeaderboard, setLocalLeaderboard] = useState<LocalScore[]>([]);

  const gameTimer = useRef<NodeJS.Timeout | null>(null);

  // ---------- WORD HINT GENERATION ---------- //
  const generateWordHint = useCallback((word: string, difficulty: number): string => {
    const wordLength = word.length;
    const revealCount = Math.max(2, Math.ceil(wordLength - (difficulty * 0.5)));
    const revealIndices = new Set([0, wordLength - 1]);
    
    while (revealIndices.size < Math.min(revealCount, wordLength)) {
      const randomIndex = Math.floor(Math.random() * wordLength);
      revealIndices.add(randomIndex);
    }
    
    return word
      .toUpperCase()
      .split('')
      .map((char, index) => revealIndices.has(index) ? char : '_')
      .join('-');
  }, []);

  // ---------- GAME LOGIC ---------- //
  const generateNewWord = useCallback((level: number) => {
    const randomWord = ORANGE_WORDS[Math.floor(Math.random() * ORANGE_WORDS.length)];
    const hint = generateWordHint(randomWord, level);
    
    setCurrentWord(randomWord);
    setWordHint(hint);
    setUserGuess('');
    setGameState(prev => ({
      ...prev,
      timeLeft: TIMER_SECONDS
    }));
  }, [generateWordHint]);

  const startNewGame = useCallback(() => {
    setGameState({
      level: 1,
      score: 0,
      tries: MAX_TRIES,
      timeLeft: TIMER_SECONDS,
      isGameOver: false,
      isPaused: false
    });
    generateNewWord(1);
  }, [generateNewWord]);

  const handleWrongGuess = useCallback(() => {
    const newTries = gameState.tries - 1;
    
    if (newTries > 0) {
      setGameState(prev => ({
        ...prev,
        tries: newTries,
        timeLeft: TIMER_SECONDS
      }));
      setGameMessage(`❌ Wrong! "${userGuess}" is not correct. ${newTries} tries left.`);
    } else {
      setGameState(prev => ({ ...prev, isGameOver: true }));
      setGameMessage(`💀 Game Over! The word was "${currentWord.toUpperCase()}" | Final Score: ${gameState.score} points (Level ${gameState.level})`);
      
      // Save score locally for demo
      if (farcasterUser && gameState.score > 0) {
        saveScoreLocally();
      }
    }
  }, [gameState.tries, gameState.score, gameState.level, userGuess, currentWord, farcasterUser]);

  const handleTimeUp = useCallback(() => {
    handleWrongGuess();
  }, [handleWrongGuess]);

  // ---------- MEMOIZED COMPONENTS (NO FLICKERING) ---------- //
  const memoizedWordHint = useMemo(() => {
    if (!wordHint) return null;
    return wordHint.split('').map((char, index) => (
      <span
        key={`${currentWord}-${index}-${char}`}
        style={{
          color: char === '_' ? '#FFB3B3' : '#FF6B35',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        }}
      >
        {char}
      </span>
    ));
  }, [wordHint, currentWord]);

  const memoizedGameStats = useMemo(() => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '15px',
      marginBottom: '20px'
    }}>
      <div>
        <div style={{ fontSize: '1.1rem', opacity: 0.8 }}>Level</div>
        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{gameState.level}</div>
      </div>
      <div>
        <div style={{ fontSize: '1.1rem', opacity: 0.8 }}>Score</div>
        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FFD23F' }}>
          {gameState.score}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '1.1rem', opacity: 0.8 }}>Lives</div>
        <div style={{ fontSize: '2rem' }}>
          {'❤️'.repeat(gameState.tries)}{'🖤'.repeat(MAX_TRIES - gameState.tries)}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '1.1rem', opacity: 0.8 }}>Time</div>
        <div style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: gameState.timeLeft <= 5 ? '#FF4444' : 'white',
          transition: 'color 0.3s ease'
        }}>
          {gameState.timeLeft}s
        </div>
      </div>
    </div>
  ), [gameState.level, gameState.score, gameState.tries, gameState.timeLeft]);

  // ---------- INITIALIZE FARCASTER SDK ---------- //
  const initializeFarcasterSDK = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        const context: FarcasterContext = await sdk.context;
        
        if (context?.user) {
          setFarcasterUser(context.user);
          setIsSDKReady(true);
          await sdk.actions.ready();
          setGameMessage(`🎉 Welcome @${context.user.username}! Let's play!`);
        } else {
          setGameMessage('⚠️ Please open this game inside Farcaster for full features');
        }
      }
    } catch (error) {
      console.error('Farcaster SDK initialization failed:', error);
      setGameMessage('🎮 Playing in demo mode - some features limited');
    }
    
    startNewGame();
  }, [startNewGame]);

  useEffect(() => {
    initializeFarcasterSDK();
    return () => {
      if (gameTimer.current) clearInterval(gameTimer.current);
    };
  }, [initializeFarcasterSDK]);

  useEffect(() => {
    if (gameState.isGameOver || gameState.isPaused) {
      if (gameTimer.current) clearInterval(gameTimer.current);
      return;
    }
    
    if (gameState.timeLeft <= 0) {
      handleTimeUp();
      return;
    }
    
    gameTimer.current = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        timeLeft: prev.timeLeft - 1
      }));
    }, 1000);
    
    return () => {
      if (gameTimer.current) clearInterval(gameTimer.current);
    };
  }, [gameState.timeLeft, gameState.isGameOver, gameState.isPaused, handleTimeUp]);

  const handleGuessSubmission = () => {
    const guess = userGuess.trim().toLowerCase();
    const correctWord = currentWord.toLowerCase();
    
    if (guess === correctWord) {
      const pointsEarned = POINTS_PER_LEVEL * gameState.level;
      const newScore = gameState.score + pointsEarned;
      const newLevel = gameState.level + 1;
      
      setGameState(prev => ({
        ...prev,
        score: newScore,
        level: newLevel,
        tries: MAX_TRIES
      }));
      
      setGameMessage(`🎉 Correct! "${currentWord.toUpperCase()}" +${pointsEarned} points!`);
      
      setTimeout(() => {
        generateNewWord(newLevel);
        setGameMessage(`Level ${newLevel} - Keep going! 🚀`);
      }, 2000);
      
    } else {
      handleWrongGuess();
    }
    
    setUserGuess('');
  };

  // ---------- LOCAL STORAGE FOR DEMO ---------- //
  const saveScoreLocally = () => {
    try {
      const newEntry: LocalScore = {
        username: farcasterUser?.username || 'Anonymous',
        score: gameState.score,
        level: gameState.level,
        timestamp: Date.now()
      };
      
      const existingScores = JSON.parse(localStorage.getItem('orangeGameScores') || '[]') as LocalScore[];
      existingScores.push(newEntry);
      
      const topScores = existingScores
        .sort((a: LocalScore, b: LocalScore) => b.score - a.score)
        .slice(0, 10);
      
      localStorage.setItem('orangeGameScores', JSON.stringify(topScores));
      setLocalLeaderboard(topScores);
    } catch (error) {
      console.error('Failed to save score locally:', error);
    }
  };

  const loadLocalScores = () => {
    try {
      const scores = JSON.parse(localStorage.getItem('orangeGameScores') || '[]') as LocalScore[];
      setLocalLeaderboard(scores);
    } catch (error) {
      console.error('Failed to load local scores:', error);
    }
  };

  useEffect(() => {
    loadLocalScores();
  }, []);

  // ---------- SOCIAL SHARING (TYPESCRIPT-SAFE) ---------- //
  const shareScore = async () => {
    const shareText = `🧡 Just scored ${gameState.score} points on Level ${gameState.level} in Inflynce Orange Guess Game! 🍊

Can you beat my score? Play now!`;
    
    try {
      if (isSDKReady) {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        await sdk.actions.openUrl(
          `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`
        );
        return;
      }
      
      // Type-safe navigator handling
      if (typeof navigator !== 'undefined') {
        // Check for Web Share API
        if ('share' in navigator) {
          try {
            const nav = navigator as any;
            await nav.share({
              title: 'Inflynce Orange Guess Game',
              text: shareText,
              url: window.location.href
            });
            return;
          } catch (shareError) {
            console.log('Share failed, falling back to clipboard');
          }
        }
        
        // Fallback to clipboard
        if ('clipboard' in navigator) {
          const nav = navigator as any;
          await nav.clipboard.writeText(shareText);
          alert('📋 Score copied to clipboard!');
          return;
        }
      }
      
      // Final fallback
      alert('Unable to share. Please copy the URL manually.');
      
    } catch (error) {
      console.error('Share error:', error);
      alert('Unable to share. Try again later.');
    }
  };

  // ---------- RENDER COMPONENT ---------- //
  return (
    <>
      <Head>
        <title>Inflynce Orange Guess Game 🧡</title>
        <meta name="description" content="A fun word-guessing game with 33+ orange-themed words, progressive difficulty, and a Base Mainnet leaderboard. Compete with players worldwide!" />
        <meta name="keywords" content="farcaster, mini app, word game, blockchain, base mainnet, orange" />
        <meta name="author" content="Inflynce" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Inflynce Orange Guess Game" />
        <meta property="og:title" content="Inflynce Orange Guess Game 🧡" />
        <meta property="og:description" content="A fun word-guessing game with 33+ orange-themed words, progressive difficulty, and Base Mainnet leaderboard. Compete with players worldwide!" />
        <meta property="og:image" content="https://inflynce-orange-guess-game.vercel.app/og-image.png" />
        <meta property="og:url" content="https://inflynce-orange-guess-game.vercel.app/" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Inflynce Orange Guess Game 🧡" />
        <meta name="twitter:description" content="Guess orange-themed words and compete on Base Mainnet leaderboard!" />
        <meta name="twitter:image" content="https://inflynce-orange-guess-game.vercel.app/og-image.png" />
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="https://inflynce-orange-guess-game.vercel.app/frame-image.png" />
        <meta property="fc:frame:button:1" content="🎮 Play Game" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="https://inflynce-orange-guess-game.vercel.app/" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      
      <div style={{
        background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #FFD23F 100%)',
        minHeight: '100vh',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: 'white'
      }}>
        
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            textShadow: '3px 3px 6px rgba(0,0,0,0.4)',
            margin: '0 0 10px 0'
          }}>
            Inflynce Orange Guess Game 🧡
          </h1>
          
          {farcasterUser && (
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '12px 20px',
              borderRadius: '25px',
              display: 'inline-block',
              marginBottom: '10px'
            }}>
              👋 Welcome @{farcasterUser.username}!
            </div>
          )}
        </div>

        {/* GAME STATUS */}
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: '20px',
          padding: '25px',
          marginBottom: '25px',
          textAlign: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          {memoizedGameStats}
          
          {/* WORD HINT - NO MORE FLICKERING */}
          <div style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            letterSpacing: '0.2em',
            margin: '20px 0',
            padding: '15px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '10px',
            transition: 'all 0.2s ease'
          }}>
            {memoizedWordHint}
          </div>
        </div>

        {/* GAME INPUT */}
        {!gameState.isGameOver && (
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <input
              type="text"
              value={userGuess}
              onChange={(e) => setUserGuess(e.target.value)}
              placeholder="Type your guess here..."
              style={{
                padding: '15px 25px',
                fontSize: '1.3rem',
                borderRadius: '25px',
                border: 'none',
                width: '300px',
                maxWidth: '80%',
                textAlign: 'center',
                marginRight: '15px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && userGuess.trim()) {
                  handleGuessSubmission();
                }
              }}
            />
            <button
              onClick={handleGuessSubmission}
              disabled={!userGuess.trim()}
              style={{
                padding: '15px 30px',
                fontSize: '1.3rem',
                borderRadius: '25px',
                border: 'none',
                backgroundColor: userGuess.trim() ? '#28A745' : '#6C757D',
                color: 'white',
                cursor: userGuess.trim() ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease'
              }}
            >
              🚀 Submit
            </button>
          </div>
        )}

        {/* GAME OVER ACTIONS */}
        {gameState.isGameOver && (
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <button
              onClick={startNewGame}
              style={{
                padding: '15px 30px',
                fontSize: '1.3rem',
                borderRadius: '25px',
                border: 'none',
                backgroundColor: 'white',
                color: '#FF6B35',
                fontWeight: 'bold',
                marginRight: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              🔄 Play Again
            </button>
            <button
              onClick={shareScore}
              style={{
                padding: '15px 30px',
                fontSize: '1.3rem',
                borderRadius: '25px',
                border: 'none',
                backgroundColor: '#007BFF',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              📱 Share Score
            </button>
          </div>
        )}

        {/* GAME MESSAGE */}
        {gameMessage && (
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.4)',
            padding: '15px 25px',
            borderRadius: '15px',
            textAlign: 'center',
            fontSize: '1.1rem',
            fontWeight: '500',
            marginBottom: '25px',
            transition: 'all 0.3s ease'
          }}>
            {gameMessage}
          </div>
        )}

        {/* CONTRACT INFO */}
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.2)',
          padding: '15px',
          borderRadius: '10px',
          marginBottom: '20px',
          textAlign: 'center',
          fontSize: '0.9rem'
        }}>
          🔗 Ready for Base Mainnet: <code>{CONTRACT_ADDRESS}</code>
          <br />
          <small>⚠️ Blockchain features temporarily disabled for deployment</small>
        </div>

        {/* LOCAL LEADERBOARD */}
        {localLeaderboard.length > 0 && (
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.4)',
            borderRadius: '20px',
            padding: '25px',
            marginTop: '30px'
          }}>
            <h2 style={{
              textAlign: 'center',
              marginBottom: '20px',
              fontSize: '1.8rem',
              fontWeight: 'bold'
            }}>
              🏆 Local Leaderboard (Demo)
            </h2>
            
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {localLeaderboard.slice(0, 10).map((player, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px 20px',
                    backgroundColor: index === 0 ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    marginBottom: '10px',
                    border: index === 0 ? '2px solid gold' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#CD7F32' : 'white'
                    }}>
                      #{index + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                        @{player.username}
                      </div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                        Level {player.level}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: '1.3rem',
                    fontWeight: 'bold',
                    color: '#FFD23F'
                  }}>
                    {player.score} pts
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
