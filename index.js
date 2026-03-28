import dotenv from 'dotenv';
dotenv.config();
import app from './src/app.js';
import http from 'http';
import { Server } from 'socket.io';
import connectDB from './src/config/db.js';
import { socketHandler } from './socket.js';

const PORT = process.env.PORT || 3000;

// 1) Connect DB
connectDB();

// 2) HTTP + Socket server
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URLS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      "https://matrimonial-main.vercel.app",
      "https://matro-main4444-main.vercel.app"
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH'],
    credentials: true,
  },
});

// 3) Attach io globally
app.set('io', io);
global.io = io; // ✅ Ye add karo

// 4) Attach socket handlers
socketHandler(io);

// 5) Handle errors gracefully
server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
});

app.get("/", async(req, res)=>{
  res.send("🚀 Server running on successfully!")
})

// 6) Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
