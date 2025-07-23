import type { AppProps } from 'next/app'
import '../styles/globals.css'  // Fixed: Changed from '@/styles/globals.css' to '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
