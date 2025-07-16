import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { createServer } from "http";
import { Server as IOServer } from "socket.io";
import { generateGame } from "./game-logic.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const WORD_PATH = path.join(__dirname, "wordlists", "duet_words.txt");
const WORDS = fs.readFileSync(WORD_PATH, "utf-8").split(/\r?\n/).filter(Boolean);

const app = express();
const httpServer = createServer(app);
const io = new IOServer(httpServer, { cors: { origin: "*" } });

// --- static React bundle ---
app.use(express.static(path.join(__dirname, "../client/dist")));

// Fallback for SPA routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

const rooms = new Map(); // roomId → { players: [socketId], state }

io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

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

  // When both players are in, push the initial state privately (each sees own key card)
  if (rooms.get(roomId).players.length === 2) {
    const gameState = rooms.get(roomId).state;
    rooms
      .get(roomId)
      .players.forEach((id, idx) =>
        io.to(id).emit("start", {
          board: gameState.publicBoard,
          key: gameState.privateKeys[idx],
          tokens: gameState.tokens,
          gameState: gameState.publicSnapshot(),
        })
      );
    console.log(`Game started in room ${roomId}`);
  }

  // Handle clue giving
  socket.on("clue", ({ clueWord, count }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const gs = room.state;
    const result = gs.giveClue(playerIdx, clueWord, count);
    
    console.log(`Player ${playerIdx} attempted to give clue: ${clueWord} (${count}) - Result: ${result.result}`);
    
    if (result.result === "success") {
      // Broadcast the clue to both players
      io.to(roomId).emit("clue", { 
        clueWord, 
        count,
        activePlayer: result.activePlayer,
        phase: result.phase
      });
      
      // Update game state
      io.to(roomId).emit("gameUpdate", gs.publicSnapshot());
    } else {
      // Send error back to the player who tried to give the clue
      socket.emit("error", { message: result.message });
    }
  });

  socket.on("guess", (cardIdx) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const gs = room.state;
    const result = gs.reveal(cardIdx, playerIdx);
    
    console.log(`Player ${playerIdx} attempted to guess card ${cardIdx}: ${result?.result}`);
    
    if (result.result === "wrongPhase" || result.result === "wrongPlayer") {
      socket.emit("error", { message: result.message });
      return;
    }
    
    if (result.result === "alreadyRevealed" || result.result === "gameOver") {
      socket.emit("error", { message: result.message });
      return;
    }
    
    // Broadcast the updated state for valid guesses
    const snapshot = gs.publicSnapshot();
    const stateUpdate = {
      ...snapshot,
      result: result?.result,
      gameOver: gs.gameOver,
      victory: gs.victory
    };
    
    console.log(`Broadcasting state update:`, {
      result: result?.result,
      agentsFound: snapshot.agentsFound,
      gameOver: gs.gameOver,
      victory: gs.victory
    });
    
    io.to(roomId).emit("state", stateUpdate);
    
    // Handle game end conditions
    if (result?.gameOver) {
      if (result.result === "victory") {
        console.log("🎉 Victory achieved! Game ended successfully.");
      } else if (result.result === "assassin") {
        console.log("💀 Assassin hit! Game ended in defeat.");
      }
      return;
    }
    
    // If turn ended (bystander), handle turn change
    if (result?.endTurn) {
      const turnResult = gs.endTurn();
      if (turnResult.result === "timeout") {
        console.log("⏰ Time's up! Game ended due to timeout.");
        io.to(roomId).emit("state", {
          ...gs.publicSnapshot(),
          result: "timeout",
          gameOver: true,
          victory: false
        });
      } else if (turnResult.result === "victory") {
        console.log("🎉 Victory achieved during turn end!");
        io.to(roomId).emit("state", {
          ...gs.publicSnapshot(),
          result: "victory",
          gameOver: true,
          victory: true
        });
      } else {
        // Continue with next turn
        const message = result.completedWords ? 
          `Player ${1 - playerIdx + 1} has found all their words!` : 
          null;
        
        io.to(roomId).emit("nextTurn", { 
          activePlayer: turnResult.activePlayer,
          phase: turnResult.phase,
          gameState: gs.publicSnapshot(),
          message
        });
      }
    }
  });

  socket.on("endTurn", () => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const gs = room.state;
    
    // Check if it's the correct player's turn to end turn
    if (gs.currentPhase !== "guess") {
      socket.emit("error", { message: "Not in guessing phase" });
      return;
    }
    
    if (playerIdx !== gs.activePlayer) {
      socket.emit("error", { message: "Not your turn to guess" });
      return;
    }
    
    console.log(`Player ${playerIdx} ended turn voluntarily`);
    
    // End the turn voluntarily
    const turnResult = gs.endTurn();
    if (turnResult.result === "timeout") {
      console.log("⏰ Time's up! Game ended due to timeout.");
      io.to(roomId).emit("state", {
        ...gs.publicSnapshot(),
        result: "timeout",
        gameOver: true,
        victory: false
      });
    } else if (turnResult.result === "victory") {
      console.log("🎉 Victory achieved during turn end!");
      io.to(roomId).emit("state", {
        ...gs.publicSnapshot(),
        result: "victory",
        gameOver: true,
        victory: true
      });
    } else {
      // Continue with next turn
      io.to(roomId).emit("nextTurn", { 
        activePlayer: turnResult.activePlayer,
        phase: turnResult.phase,
        gameState: gs.publicSnapshot(),
        message: `Player ${playerIdx + 1} ended their turn`
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    rooms.delete(roomId);
  });
});

httpServer.listen(PORT, () => console.log(`Server running on :${PORT}`));
