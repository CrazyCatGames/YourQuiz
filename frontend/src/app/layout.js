import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

export const metadata = {
  title:       'YourQuiz',
  description: 'Realtime quiz platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className="bg-void noise">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
