# YourQuiz

## Скачать проект с GitHub

### Создать .env файл в папке backend и заполнить его следующими переменными:

```env
DATABASE_URL="postgresql://quiz_user:quiz_pass@localhost:5432/quiz_db"

JWT_SECRET="длинная-случайная-строка-минимум-32-символа"
JWT_REFRESH_SECRET="ещё-одна-длинная-случайная-строка"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

PORT=4000
CLIENT_URL="http://localhost:3000"
NODE_ENV="development"

UPLOAD_DIR="uploads"
MAX_FILE_SIZE_MB=5
```
---

### Создать .env файл в папке frontend и заполнить его следующими переменными:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```
---

### Запустить проект с помощью Docker Compose находясь в корневой папке проекта (там где находится docker-compose.yml):

```bash
docker compose up --build
```
---

### Чтобы остановить проект, нажмите Ctrl+C в терминале, а затем выполните команду:
```bash
docker compose down
```