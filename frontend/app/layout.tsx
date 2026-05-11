import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Learn-ing - Track Your Learning Progress',
  description: 'Track courses, quizzes, rankings, and adaptive learning progress with RabbitCourse.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f6f6f4]">
        <main>{children}</main>
      </body>
    </html>
  )
}
