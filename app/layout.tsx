import type { Metadata } from 'next'
import './globals.css'
import { Geist, Geist_Mono, Source_Serif_4 } from 'next/font/google'

// Initialize fonts
const geist = Geist({ 
  subsets: ['latin'], 
  weight: ["100","200","300","400","500","600","700","800","900"],
  variable: '--font-geist'
})

const geistMono = Geist_Mono({ 
  subsets: ['latin'], 
  weight: ["100","200","300","400","500","600","700","800","900"],
  variable: '--font-geist-mono'
})

const sourceSerif4 = Source_Serif_4({ 
  subsets: ['latin'], 
  weight: ["200","300","400","500","600","700","800","900"],
  variable: '--font-source-serif'
})

export const metadata: Metadata = {
  title: 'Hifdzh Tracker - Quran Memorization',
  description: 'Track your Quran memorization journey with daily goals, streaks, and progress insights',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html 
      lang="en" 
      className={`${geist.variable} ${geistMono.variable} ${sourceSerif4.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}