import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Basic Meta */}
        <meta name="description" content="A fun word-guessing game with 33+ orange-themed words, progressive difficulty, and a Base Mainnet leaderboard. Compete with players worldwide!" />
        <meta name="keywords" content="farcaster, mini app, word game, blockchain, base mainnet, orange" />
        <meta name="author" content="Inflynce" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Inflynce Orange Guess Game" />
        <meta property="og:title" content="Inflynce Orange Guess Game 🧡" />
        <meta property="og:description" content="A fun word-guessing game with 33+ orange-themed words, progressive difficulty, and Base Mainnet leaderboard. Compete with players worldwide!" />
        <meta property="og:image" content="https://inflynce-orange-guess-game.vercel.app/og-image.png" />
        <meta property="og:url" content="https://inflynce-orange-guess-game.vercel.app/" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Inflynce Orange Guess Game 🧡" />
        <meta name="twitter:description" content="Guess orange-themed words and compete on Base Mainnet leaderboard!" />
        <meta name="twitter:image" content="https://inflynce-orange-guess-game.vercel.app/og-image.png" />
        
        {/* Farcaster Frame Meta Tags - Version 1 */}
        <meta property="fc:frame" content="1" />
        <meta property="fc:frame:image" content="https://inflynce-orange-guess-game.vercel.app/frame-image.png" />
        <meta property="fc:frame:image:aspect_ratio" content="1:1" />
        <meta property="fc:frame:button:1" content="🎮 Play Now" />
        <meta property="fc:frame:button:1:action" content="link" />
        <meta property="fc:frame:button:1:target" content="https://inflynce-orange-guess-game.vercel.app/" />
        <meta property="fc:frame:button:2" content="🏆 Leaderboard" />
        <meta property="fc:frame:button:2:action" content="link" />
        <meta property="fc:frame:button:2:target" content="https://inflynce-orange-guess-game.vercel.app/#leaderboard" />
        
        {/* Additional Farcaster Support */}
        <meta property="farcaster:frame" content="1" />
        <meta property="farcaster:frame:image" content="https://inflynce-orange-guess-game.vercel.app/frame-image.png" />
        <meta property="farcaster:frame:button:1" content="🎮 Play Game" />
        <meta property="farcaster:frame:button:1:action" content="link" />
        <meta property="farcaster:frame:button:1:target" content="https://inflynce-orange-guess-game.vercel.app/" />
        
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
