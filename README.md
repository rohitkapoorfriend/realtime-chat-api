# 💬 Real-Time Chat API

> Scalable WebSocket-based chat backend with rooms, typing indicators, message persistence, online presence, and file sharing. Built for production.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socket.io&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)

---

## 🏗️ Architecture

```
┌──────────────┐         ┌──────────────────────────────────┐
│   Client A   │◄──WSS──►│         Node.js Server           │
└──────────────┘         │                                  │
                         │  ┌────────────┐  ┌───────────┐  │
┌──────────────┐         │  │ Socket.io  │  │  Express   │  │
│   Client B   │◄──WSS──►│  │  (WS Hub)  │  │ (REST API) │  │
└──────────────┘         │  └─────┬──────┘  └─────┬─────┘  │
                         │        │               │         │
┌──────────────┐         │  ┌─────▼───────────────▼─────┐  │
│   Client C   │◄──WSS──►│  │     Redis Pub/Sub         │  │
└──────────────┘         │  │  (Presence + Scaling)      │  │
                         │  └─────────────┬─────────────┘  │
                         │                │                 │
                         │  ┌─────────────▼─────────────┐  │
                         │  │        MongoDB             │  │
                         │  │  (Messages + Rooms + Users)│  │
                         │  └───────────────────────────┘  │
                         └──────────────────────────────────┘
```

## ✨ Features

- **WebSocket Real-Time Messaging** — Instant message delivery via Socket.io
- **Chat Rooms** — Create public/private rooms, invite users, set admins
- **1-to-1 Direct Messages** — Private conversations between two users
- **Typing Indicators** — Real-time "user is typing..." events
- **Online Presence** — Track who's online/offline with Redis pub/sub
- **Message Persistence** — All messages saved to MongoDB with pagination
- **Read Receipts** — Track message delivery and read status
- **File Sharing** — Upload images/files to local storage (S3-ready)
- **Message Search** — Full-text search across chat history
- **JWT Authentication** — Secure WebSocket connections with token auth
- **Rate Limiting** — Prevent message spam per user
- **Docker Ready** — `docker-compose up` and everything runs
- **Built-in Test Client** — HTML page to test chat in browser

## 🚀 Quick Start

### Option 1: Docker (Recommended)
```bash
git clone https://github.com/rohitkapoorfriend/realtime-chat-api.git
cd realtime-chat-api
docker-compose up
```
- API: `http://localhost:3001`
- Test Client: `http://localhost:3001/chat`

### Option 2: Local (Requires MongoDB + Redis running)
```bash
npm install
cp .env.example .env
npm run dev
```

### Option 3: Local without Redis (simplified mode)
```bash
REDIS_ENABLED=false npm run dev
```
Runs without Redis — presence tracking uses in-memory store. Good for development.

## 📡 REST API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, get JWT token |
| GET | `/api/auth/me` | Get current user profile |

### Rooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rooms` | Create a new room |
| GET | `/api/rooms` | List user's rooms |
| GET | `/api/rooms/:id` | Get room details + members |
| POST | `/api/rooms/:id/join` | Join a public room |
| POST | `/api/rooms/:id/invite` | Invite user to private room |
| DELETE | `/api/rooms/:id/leave` | Leave a room |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms/:id/messages` | Get messages (paginated) |
| GET | `/api/messages/search` | Search messages |
| DELETE | `/api/messages/:id` | Delete a message (own only) |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/online` | List online users |
| GET | `/api/users/search?q=name` | Search users |

## 🔌 WebSocket Events

### Client → Server (Emit)
```javascript
// Join a room
socket.emit('room:join', { roomId: 'room_abc123' });

// Send a message
socket.emit('message:send', { 
  roomId: 'room_abc123', 
  content: 'Hello everyone!',
  type: 'text' // text | image | file
});

// Typing indicator
socket.emit('typing:start', { roomId: 'room_abc123' });
socket.emit('typing:stop', { roomId: 'room_abc123' });

// Mark messages as read
socket.emit('message:read', { roomId: 'room_abc123', messageId: 'msg_xyz' });

// Direct message
socket.emit('dm:send', { toUserId: 'user_456', content: 'Hey!' });
```

### Server → Client (Listen)
```javascript
// New message in a room
socket.on('message:new', (data) => {
  // { id, roomId, sender: { id, name, avatar }, content, type, createdAt }
});

// User started typing
socket.on('typing:update', (data) => {
  // { roomId, userId, userName, isTyping: true }
});

// User online/offline status
socket.on('presence:update', (data) => {
  // { userId, userName, status: 'online' | 'offline', lastSeen }
});

// Message read receipt
socket.on('message:read', (data) => {
  // { messageId, readBy: userId, readAt }
});

// Room updates
socket.on('room:update', (data) => {
  // { roomId, event: 'user_joined' | 'user_left', user: { id, name } }
});

// Error
socket.on('error', (data) => {
  // { code: 'RATE_LIMIT' | 'AUTH_FAILED' | 'ROOM_NOT_FOUND', message: '...' }
});
```

## 🧪 Test Client

Open `http://localhost:3001/chat` in your browser for a built-in test page:

1. Register/Login to get a JWT token
2. Connect to WebSocket with the token
3. Create or join rooms
4. Send messages in real-time
5. Open in 2 browser tabs to test multi-user chat

## 🗂️ Project Structure

```
realtime-chat-api/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   ├── redis.js             # Redis connection + pub/sub
│   │   └── socket.js            # Socket.io setup + auth
│   ├── middleware/
│   │   ├── auth.js              # JWT auth for REST + WebSocket
│   │   ├── rateLimiter.js       # Message rate limiting
│   │   └── errorHandler.js      # Global error handler
│   ├── models/
│   │   ├── User.js              # User schema with online status
│   │   ├── Room.js              # Room schema (public/private/DM)
│   │   └── Message.js           # Message schema with read receipts
│   ├── routes/
│   │   ├── auth.routes.js       # Auth endpoints
│   │   ├── room.routes.js       # Room CRUD
│   │   ├── message.routes.js    # Message history + search
│   │   └── user.routes.js       # User search + presence
│   ├── services/
│   │   ├── chat.service.js      # Core chat logic
│   │   ├── presence.service.js  # Online/offline tracking
│   │   └── room.service.js      # Room management
│   ├── socket/
│   │   ├── handlers.js          # WebSocket event handlers
│   │   └── middleware.js        # Socket auth + rate limit
│   ├── utils/
│   │   └── logger.js            # Winston logger
│   ├── public/
│   │   └── chat.html            # Built-in test client
│   └── app.js                   # Express + Socket.io server
├── tests/
│   ├── auth.test.js
│   ├── chat.test.js
│   └── room.test.js
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## ⚙️ Environment Variables

```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/realtime-chat
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
MAX_MESSAGES_PER_MINUTE=30
MAX_FILE_SIZE_MB=5
CORS_ORIGIN=*
```

## 🐳 Docker

```bash
docker-compose up        # Start API + MongoDB + Redis
docker-compose down      # Stop everything
docker-compose logs -f   # View logs
```

## 🔑 Why This Project?

This project showcases patterns I've used in production real-time systems:

1. **WebSocket Architecture** — Socket.io with room-based messaging, authentication middleware, and error handling
2. **Scalability with Redis** — Pub/Sub for horizontal scaling across multiple server instances
3. **Presence System** — Real-time online/offline tracking with heartbeat mechanism
4. **Production Patterns** — Rate limiting, input sanitization, graceful disconnection handling
5. **Database Design** — Efficient schemas for message pagination, read receipts, and room membership
6. **Full API** — Both REST (for CRUD) and WebSocket (for real-time) working together

---

## 👨‍💻 Author

**Rohit Kapoor** — Senior Backend Engineer | 11+ Years

- 📧 rohitkapoorfriend@gmail.com
- 💼 [LinkedIn](https://www.linkedin.com/in/rohit-kapoor-5945a987/)
- 🐙 [GitHub](https://github.com/rohitkapoorfriend)

> 🟢 **Available for remote contract work** — US/EU time zones

## 📄 License

MIT
