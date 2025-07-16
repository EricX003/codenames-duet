import { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";

export default function useSocket() {
  const [connected, setConnected] = useState(false);
  const [socket] = useState(() => {
    const socketUrl = window.location.origin;
    console.log("Connecting to:", socketUrl);
    return io(socketUrl, {
      transports: ["websocket", "polling"],
      timeout: 10000,
      forceNew: true,
    });
  });
  const [you, setYou] = useState(null);
  const [board, setBoard] = useState([]);
  const [key, setKey] = useState([]);
  const [tokens, setTokens] = useState({ bank: 9, used: 0 });
  const [turn, setTurn] = useState(0);
  const [clue, setClue] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [activePlayer, setActivePlayer] = useState(0);
  const [currentPhase, setCurrentPhase] = useState("clue");
  const [agentsFound, setAgentsFound] = useState({ total: 0, player0: 0, player1: 0 });
  const [wordsRemaining, setWordsRemaining] = useState([9, 9]);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Determine if it's this player's turn
  const isMyTurn = you !== null && activePlayer === you;
  const canGiveClue = isMyTurn && currentPhase === "clue" && !gameOver;
  const canGuess = isMyTurn && currentPhase === "guess" && !gameOver;

  const sendClue = useCallback((word, count) => {
    if (!canGiveClue) {
      console.log("Cannot give clue right now");
      return;
    }
    console.log(`Sending clue: ${word} (${count})`);
    socket.emit("clue", { clueWord: word, count });
  }, [socket, canGiveClue]);

  const sendGuess = useCallback((idx) => {
    if (!canGuess) {
      console.log("Cannot guess right now");
      return;
    }
    console.log(`Sending guess: ${idx}`);
    socket.emit("guess", idx);
  }, [socket, canGuess]);

  useEffect(() => {
    const handleConnect = () => {
      console.log("Connected to server");
      setConnected(true);
      setError(null);
    };

    const handleConnectError = (error) => {
      console.error("Connection error:", error);
      setConnected(false);
    };

    const handleDisconnect = (reason) => {
      console.log("Disconnected from server:", reason);
      setConnected(false);
    };

    const handleInit = ({ you: playerIndex }) => {
      console.log(`You are player ${playerIndex}`);
      setYou(playerIndex);
    };

    const handleStart = ({ board, key, tokens, gameState }) => {
      console.log("Game started", { board: board.length, key: key.length });
      setBoard(board);
      setKey(key);
      setTokens(tokens);
      setGameOver(false);
      setVictory(false);
      setClue(null);
      
      // Set initial game state
      if (gameState) {
        setTurn(gameState.turn);
        setActivePlayer(gameState.activePlayer);
        setCurrentPhase(gameState.currentPhase);
        setAgentsFound(gameState.agentsFound);
        setWordsRemaining(gameState.wordsRemaining);
      }
    };

    const handleClue = ({ clueWord, count, activePlayer: newActivePlayer, phase }) => {
      console.log(`Clue received: ${clueWord} (${count})`);
      setClue({ word: clueWord, count });
      setActivePlayer(newActivePlayer);
      setCurrentPhase(phase);
      setError(null);
    };

    const handleGameUpdate = (gameState) => {
      console.log("Game state update:", gameState);
      setTurn(gameState.turn);
      setActivePlayer(gameState.activePlayer);
      setCurrentPhase(gameState.currentPhase);
      setTokens(gameState.tokens);
      setAgentsFound(gameState.agentsFound);
      setWordsRemaining(gameState.wordsRemaining);
    };

    const handleState = ({ board, tokens, result, gameOver, victory, agentsFound, wordsRemaining }) => {
      console.log("State update:", { result, gameOver, victory, agentsFound });
      setBoard(board);
      setTokens(tokens);
      setGameOver(gameOver);
      setVictory(victory);
      
      if (agentsFound) setAgentsFound(agentsFound);
      if (wordsRemaining) setWordsRemaining(wordsRemaining);
      
      if (gameOver) {
        setCurrentPhase("gameOver");
      } else if (result === "bystander") {
        // Turn will end, wait for nextTurn event
        setClue(null);
      }
      setError(null);
    };

    const handleNextTurn = ({ activePlayer: newActivePlayer, phase, gameState, message }) => {
      console.log("Next turn:", { activePlayer: newActivePlayer, phase });
      setActivePlayer(newActivePlayer);
      setCurrentPhase(phase);
      setClue(null);
      
      if (message) {
        setMessage(message);
        setTimeout(() => setMessage(null), 5000); // Clear message after 5 seconds
      }
      
      if (gameState) {
        setTurn(gameState.turn);
        setTokens(gameState.tokens);
        setAgentsFound(gameState.agentsFound);
        setWordsRemaining(gameState.wordsRemaining);
      }
    };

    const handleError = ({ message }) => {
      console.error("Game error:", message);
      setError(message);
      setTimeout(() => setError(null), 3000); // Clear error after 3 seconds
    };

    // Add all event listeners
    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);
    socket.on("init", handleInit);
    socket.on("start", handleStart);
    socket.on("clue", handleClue);
    socket.on("gameUpdate", handleGameUpdate);
    socket.on("state", handleState);
    socket.on("nextTurn", handleNextTurn);
    socket.on("error", handleError);

    // Cleanup function
    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
      socket.off("init", handleInit);
      socket.off("start", handleStart);
      socket.off("clue", handleClue);
      socket.off("gameUpdate", handleGameUpdate);
      socket.off("state", handleState);
      socket.off("nextTurn", handleNextTurn);
      socket.off("error", handleError);
    };
  }, [socket]);

  return {
    connected,
    you,
    board,
    key,
    tokens,
    turn,
    clue,
    gameOver,
    victory,
    activePlayer,
    currentPhase,
    isMyTurn,
    canGiveClue,
    canGuess,
    agentsFound,
    wordsRemaining,
    error,
    message,
    sendClue,
    sendGuess,
  };
}
