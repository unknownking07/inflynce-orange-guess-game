import { useState, useEffect, useRef } from 'react';

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

// ---------- YOUR DEPLOYED CONTRACT ON BASE MAINNET ---------- //
const CONTRACT_ADDRESS = '0xA52357561265e6Ca8dE400139329D58347106087';

const CONTRACT_ABI = [
  {
    "inputs": [
      {"name": "playerWallet", "type": "address"},
      {"name": "username", "type": "string"},
      {"name": "score", "type": "uint256"},
      {"name": "level", "type": "uint256"}
    ],
    "name": "submitScore",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "n", "type": "uint256"}],
    "name": "getTopN",
    "outputs": [
      {
        "components": [
          {"name": "wallet", "type": "address"},
          {"name": "username", "type": "string"},
          {"name": "score", "type": "uint256"},
          {"name": "level", "type": "uint256"},
          {"name": "timestamp", "type": "uint256"}
        ],
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "player", "type": "address"}],
    "name": "getPlayerStats",
    "outputs": [
      {"name": "bestScore", "type": "uint256"},
      {"name": "username", "type": "string"},
      {"name": "maxLevel", "type": "uint256"},
      {"name": "rank", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

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

  // ---------- FARCASTER & BLOCKCHAIN STATE ---------- //
  const [farcasterUser, setFarcasterUser] = useState(null);
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerStats, setPlayerStats] = useState(null);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [blockchainStatus, setBlockchainStatus] = useState('');

  const gameTimer = useRef(null);

  // ---------- INITIALIZE FARCASTER SDK ---------- //
  useEffect(() => {
    initializeFarcasterSDK();
    return () => {
      if (gameTimer.current) clearInterval(gameTimer.current);
    };
  }, []);

  const initializeFarcasterSDK = async () => {
    try {
      if (typeof window !== 'undefined') {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        
        const context = await sdk.context;
        
        if (context?.user) {
          setFarcasterUser(context.user);
          setIsSDKReady(true);
          await sdk.actions.ready();
          setGameMessage(`🎉 Welcome @${context.user.username}! Let's play!`);
          
          await Promise.all([
            loadPlayerStats(context.user),
            loadLeaderboard()
          ]);
        } else {
          setGameMessage('⚠️ Please open this game inside Farcaster for full features');
        }
      }
    } catch (error) {
      console.error('Farcaster SDK initialization failed:', error);
      setGameMessage('🎮 Playing in demo mode - some features limited');
    }
    
    startNewGame();
  };

  // ---------- GAME TIMER ---------- //
  useEffect(() => {
    if (gameState.isGameOver || gameState.isPaused) {
      clearInterval(gameTimer.current);
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

    return () => clearInterval(gameTimer.current);
  }, [gameState.timeLeft, gameState.isGameOver, gameState.isPaused]);

  // ---------- WORD HINT GENERATION ---------- //
  const generateWordHint = (word, difficulty) => {
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
  };

  // ---------- GAME LOGIC ---------- //
  const startNewGame = () => {
    setGameState({
      level: 1,
      score: 0,
      tries: MAX_TRIES,
      timeLeft: TIMER_SECONDS,
      isGameOver: false,
      isPaused: false
    });
    generateNewWord(1);
  };

  const generateNewWord = (level) => {
    const randomWord = ORANGE_WORDS[Math.floor(Math.random() * ORANGE_WORDS.length)];
    const hint = generateWordHint(randomWord, level);
    
    setCurrentWord(randomWord);
    setWordHint(hint);
    setUserGuess('');
    setGameState(prev => ({
      ...prev,
      timeLeft: TIMER_SECONDS
    }));
  };

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

  const handleWrongGuess = () => {
    const newTries = gameState.tries - 1;
    
    if (newTries > 0) {
      setGameState(prev => ({
        ...prev,
        tries: newTries,
        timeLeft: TIMER_SECONDS
      }));
      setGameMessage(`❌ Wrong! "${userGuess}" is not correct. ${newTries} tries left.`);
    } else {
      endGame(`💀 Game Over! The word was "${currentWord.toUpperCase()}"`);
    }
  };

  const handleTimeUp = () => {
    handleWrongGuess();
  };

  const endGame = async (message) => {
    setGameState(prev => ({ ...prev, isGameOver: true }));
    setGameMessage(`${message} | Final Score: ${gameState.score} points (Level ${gameState.level})`);
    
    if (isSDKReady && farcasterUser && gameState.score > 0) {
      await submitScoreToBlockchain();
    }
  };

  // ---------- BLOCKCHAIN FUNCTIONS ---------- //
  const submitScoreToBlockchain = async () => {
    if (!isSDKReady || !farcasterUser || gameState.score === 0) return;
    
    setIsSubmittingScore(true);
    setBlockchainStatus('🔗 Submitting score to Base blockchain...');
    
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      
      // Use Farcaster wallet address
      const walletAddress = farcasterUser.verifiedAddresses?.eth_addresses?.[0] || 
                           `0x${farcasterUser.fid.toString().padStart(40, '0')}`;
      
      const transactionId = await sdk.actions.sendTransaction({
        chainId: 'eip155:8453', // Base Mainnet
        method: 'eth_sendTransaction',
        params: {
          abi: CONTRACT_ABI,
          to: CONTRACT_ADDRESS,
          data: {
            functionName: 'submitScore',
            args: [
              walletAddress,
              farcasterUser.username || 'Anonymous',
              gameState.score,
              gameState.level
            ]
          }
        }
      });
      
      setBlockchainStatus('✅ Score saved to Base blockchain successfully!');
      
      setTimeout(async () => {
        await Promise.all([
          loadLeaderboard(),
          loadPlayerStats(farcasterUser)
        ]);
      }, 3000);
      
    } catch (error) {
      console.error('Blockchain submission error:', error);
      setBlockchainStatus('❌ Failed to save score to blockchain');
    }
    
    setIsSubmittingScore(false);
  };

  const loadLeaderboard = async () => {
    if (!isSDKReady) return;
    
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      
      const topPlayers = await sdk.actions.readContract({
        chainId: 'eip155:8453',
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getTopN',
        args: [10]
      });
      
      setLeaderboard(topPlayers || []);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  };

  const loadPlayerStats = async (user) => {
    if (!isSDKReady || !user) return;
    
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const walletAddress = user.verifiedAddresses?.eth_addresses?.[0] || 
                           `0x${user.fid.toString().padStart(40, '0')}`;
      
      const stats = await sdk.actions.readContract({
        chainId: 'eip155:8453',
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getPlayerStats',
        args: [walletAddress]
      });
      
      if (stats && stats[0] > 0) {
        setPlayerStats({
          bestScore: Number(stats[0]),
          username: stats[1],
          maxLevel: Number(stats[2]),
          rank: Number(stats[3])
        });
      }
    } catch (error) {
      console.error('Failed to load player stats:', error);
    }
  };

  // ---------- SOCIAL SHARING ---------- //
  const shareScore = async () => {
    const rankText = playerStats?.rank > 0 ? ` (Rank #${playerStats.rank})` : '';
    const shareText = `🧡 Just scored ${gameState.score} points on Level ${gameState.level} in Inflynce Orange Guess Game${rankText}! 🍊

Can you beat my score? Play now!`;
    
    try {
      if (isSDKReady) {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        await sdk.actions.openUrl(
          `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`
        );
      } else {
        if (navigator.share) {
          await navigator.share({
            title: 'Inflynce Orange Guess Game',
            text: shareText,
            url: window.location.href
          });
        } else {
          await navigator.clipboard.writeText(shareText);
          alert('📋 Score copied to clipboard!');
        }
      }
    } catch (error) {
      console.error('Share error:', error);
      alert('Unable to share. Try again later.');
    }
  };

  // ---------- RENDER COMPONENT ---------- //
  return (
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
            {playerStats?.rank > 0 && (
              <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>
                🏆 Rank #{playerStats.rank}
              </span>
            )}
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
              color: gameState.timeLeft <= 5 ? '#FF4444' : 'white'
            }}>
              {gameState.timeLeft}s
            </div>
          </div>
        </div>

        {/* WORD HINT */}
        <div style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          fontFamily: 'monospace',
          letterSpacing: '0.2em',
          margin: '20px 0',
          padding: '15px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '10px'
        }}>
          {wordHint.split('').map((char, index) => (
            <span
              key={index}
              style={{
                color: char === '_' ? '#FFB3B3' : '#FF6B35',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
              }}
            >
              {char}
            </span>
          ))}
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
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
          >
            🔄 Play Again
          </button>
          <button
            onClick={shareScore}
            disabled={isSubmittingScore}
            style={{
              padding: '15px 30px',
              fontSize: '1.3rem',
              borderRadius: '25px',
              border: 'none',
              backgroundColor: isSubmittingScore ? '#6C757D' : '#007BFF',
              color: 'white',
              fontWeight: 'bold',
              cursor: isSubmittingScore ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
          >
            {isSubmittingScore ? '⏳ Saving...' : '📱 Share Score'}
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
          marginBottom: '25px'
        }}>
          {gameMessage}
        </div>
      )}

      {/* BLOCKCHAIN STATUS */}
      {blockchainStatus && (
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: '12px 20px',
          borderRadius: '10px',
          textAlign: 'center',
          fontSize: '1rem',
          marginBottom: '20px'
        }}>
          {blockchainStatus}
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
        🔗 Contract: <code>{CONTRACT_ADDRESS}</code> on Base Mainnet
      </div>

      {/* LEADERBOARD */}
      {leaderboard.length > 0 && (
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
            🏆 Base Mainnet Leaderboard
          </h2>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {leaderboard.slice(0, 10).map((player, index) => (
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
                  border: index === 0 ? '2px solid gold' : 'none'
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
                      Level {Number(player.level)}
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: '1.3rem',
                  fontWeight: 'bold',
                  color: '#FFD23F'
                }}>
                  {Number(player.score)} pts
                </div>
              </div>
            ))}
          </div>
          
          <button
            onClick={loadLeaderboard}
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '15px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            🔄 Refresh Leaderboard
          </button>
        </div>
      )}

      {/* PLAYER STATS */}
      {playerStats && (
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: '15px',
          padding: '20px',
          marginTop: '20px',
          textAlign: 'center'
        }}>
          <h3 style={{ marginBottom: '15px' }}>📊 Your Stats</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '15px'
          }}>
            <div>
              <div style={{ opacity: 0.8 }}>Best Score</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FFD23F' }}>
                {playerStats.bestScore}
              </div>
            </div>
            <div>
              <div style={{ opacity: 0.8 }}>Max Level</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {playerStats.maxLevel}
              </div>
            </div>
            <div>
              <div style={{ opacity: 0.8 }}>Rank</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FF6B35' }}>
                #{playerStats.rank}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
