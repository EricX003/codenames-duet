import fs from "fs";
import path from "path";
import express from "express";
import { createServer } from "http";
import { Server as IOServer } from "socket.io";
import { generateGame } from "./game-logic.js";

const PORT = process.env.PORT || 8080;
const WORD_PATH = path.join(__dirname, "wordlists", "duet_words.txt");
const WORDS = fs.readFileSync(WORD_PATH, "utf-8").split(/\r?\n/).filter(Boolean);

const app = express();
const httpServer = createServer(app);
const io = new IOServer(httpServer, { cors: { origin: "*" } });

// --- static React bundle ---
app.use(express.static(path.join(__dirname, "../client/dist")));

const rooms = new Map(); // roomId → { players: [socketId], state }

io.on("connection", (socket) => {
  // Step 1: auto-match exactly two sockets
  let roomId = [...rooms.keys()].find(
    (id) => rooms.get(id).players.length === 1
  );
  if (!roomId) {
    roomId = crypto.randomUUID();
    rooms.set(roomId, { players: [], state: generateGame(WORDS) });
  }
  rooms.get(roomId).players.push(socket.id);
  socket.join(roomId);

  const playerIdx = rooms.get(roomId).players.length - 1; // 0 or 1
  socket.emit("init", { you: playerIdx });

  // When both in, push the initial state privately (each sees own key card)
  if (rooms.get(roomId).players.length === 2) {
    rooms
      .get(roomId)
      .players.forEach((id, idx) =>
        io.to(id).emit("start", {
          board: rooms.get(roomId).state.publicBoard,
          key: rooms.get(roomId).state.privateKeys[idx],
          tokens: rooms.get(roomId).state.tokens,
          turn: 0,
        })
      );
  }

  // Step 2: relay moves
  socket.on("clue", ({ clueWord, count }) => {
    io.to(roomId).emit("clue", { clueWord, count });
  });

  socket.on("guess", (cardIdx) => {
    const gs = rooms.get(roomId).state;
    gs.reveal(cardIdx, playerIdx); // mutates board, tokens, turn
    io.to(roomId).emit("state", gs.publicSnapshot());
  });

  socket.on("disconnect", () => rooms.delete(roomId));
});

httpServer.listen(PORT, () => console.log(`Server on :${PORT}`));
