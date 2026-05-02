import 'dotenv/config'
import express    from 'express'
import cors       from 'cors'
import { createServer } from 'http'
import { Server }       from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'

import routes                from './routes/index.js'
import { errorHandler }      from './middleware/errorHandler.js'
import { registerSocketHandlers } from './socket/handlers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Express ──────────────────────────────────────────────────
const app = express()

app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Статика — загруженные изображения
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')))

// REST API
app.use('/api', routes)

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }))

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

// Global error handler
app.use(errorHandler)

// ─── HTTP + Socket.IO ─────────────────────────────────────────
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin:  process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
})

registerSocketHandlers(io)

// ─── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
  console.log(`
  ✅  Quiz API running
  ─────────────────────────────
  HTTP:      http://localhost:${PORT}
  Socket.IO: ws://localhost:${PORT}
  Env:       ${process.env.NODE_ENV || 'development'}
  `)
})
