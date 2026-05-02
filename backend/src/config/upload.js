import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads'

// Создать папку uploads если не существует
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${uuidv4()}${ext}`)
  },
})

const fileFilter = (_req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowed.includes(ext)) return cb(null, true)
  cb(new Error('Allowed image types: jpg, jpeg, png, webp, gif'))
}

const maxSizeMb = Number(process.env.MAX_FILE_SIZE_MB || 5)

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMb * 1024 * 1024 },
})
