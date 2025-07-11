import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export default function useSocket() {
  const [connected, setConnected] = useState(false);
  const [socket] = useState(() => io());
  const [you, setYou] = useState(null);
  const [board, setBoard] = useState([]);
  const [key, setKey] = useState([]);
  const [tokens, setTokens] = useState({ bank: 9, used: [] });
  const [turn, setTurn] = useState(0);
  const [clue, setClue] = useState(null);
  const [phase, setPhase] = useState("wait"); // wait | clue | guess

  useEffect(() => {
    socket.on("connect", () => setConnected(true));

    socket.on("init", ({ you }) => setYou(you));
    socket.on("start", ({ board, key, tokens, turn }) => {
      setBoard(board);
      setKey(key);
      setTokens(tokens);
      setTurn(turn);
      setPhase(you === 0 ? "clue" : "wait");
    });

    socket.on("clue", ({ clueWord, count }) => {
      setClue({ word: clueWord, count });
      setPhase("guess");
    });

    socket.on("state", ({ board, tokens, turn, nextPhase }) => {
      setBoard(board);
      setTokens(tokens);
      setTurn(turn);
      setPhase(nextPhase);
      if (nextPhase === "clue") setClue(null);
    });

    return () => socket.disconnect();
  }, [socket, you]);

  const sendClue = (word, count) => {
    socket.emit("clue", { clueWord: word, count });
    setPhase("wait");
  };

  const sendGuess = (idx) => {
    socket.emit("guess", idx);
    setPhase("wait");
  };

  return {
    connected,
    you,
    board,
    key,
    tokens,
    turn,
    clue,
    phase,
    sendClue,
    sendGuess,
  };
}
