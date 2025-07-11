import { useState } from "react";
import Board from "./components/Board";
import TokenBar from "./components/TokenBar";
import useSocket from "./hooks/useSocket";

export default function App() {
  const {
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
  } = useSocket();

  // local form state
  const [clueWord, setClueWord] = useState("");
  const [count, setCount] = useState("");

  if (!connected) {
    return (
      <div className="h-screen flex items-center justify-center text-lg">
        Connecting…
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 flex flex-col items-center gap-6">
      <h1 className="text-4xl font-bold tracking-tight">Codenames Duet</h1>

      {/* Token row */}
      <TokenBar tokens={tokens} />

      {/* Current clue banner */}
      {clue && (
        <p className="text-xl">
          <span className="font-semibold">Clue:</span> “{clue.word}” ({clue.count})
        </p>
      )}

      {/* 5×5 board */}
      <Board
        board={board}
        privateKey={key}
        onGuess={sendGuess}
        disabled={phase !== "guess"}
      />

      {/* Clue form – visible only on your turn */}
      {phase === "clue" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendClue(clueWord.trim(), Number(count));
            setClueWord("");
            setCount("");
          }}
          className="flex items-end gap-2 mt-4"
        >
          <div className="flex flex-col">
            <label className="text-sm mb-1">Word</label>
            <input
              required
              value={clueWord}
              onChange={(e) => setClueWord(e.target.value)}
              className="rounded-lg border p-2 w-40"
              placeholder="e.g. Ocean"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm mb-1">Count</label>
            <input
              required
              type="number"
              min="0"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="rounded-lg border p-2 w-20"
            />
          </div>
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg px-4 py-2"
          >
            Send
          </button>
        </form>
      )}

      {/* Turn indicator */}
      <p className="mt-4 text-gray-500">
        You are <span className="font-semibold">Player {you + 1}</span> · Turn{" "}
        {turn + 1}
      </p>
    </div>
  );
}
