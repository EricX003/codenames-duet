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
    sendEndTurn,
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

  if (you === null) {
    return (
      <div className="h-screen flex items-center justify-center text-lg">
        Waiting for game to start...
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className="min-h-screen py-8 flex flex-col items-center gap-6">
        <h1 className="text-4xl font-bold tracking-tight">Codenames Duet</h1>
        
        <div className="text-center">
          {victory ? (
            <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg">
              <h2 className="text-2xl font-bold mb-2">🎉 Victory!</h2>
              <p>You successfully contacted all 15 agents!</p>
              <p className="text-sm mt-2">Agents found: {agentsFound.total}/15</p>
            </div>
          ) : (
            <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg">
              <h2 className="text-2xl font-bold mb-2">💀 Mission Failed</h2>
              <p>You either hit an assassin or ran out of time.</p>
              <p className="text-sm mt-2">Agents found: {agentsFound.total}/15</p>
            </div>
          )}
        </div>

        {/* Show final board state */}
        <Board
          board={board}
          privateKey={key}
          onGuess={() => {}} // Disabled
          disabled={true}
        />

        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-6 py-3"
        >
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-4 sm:py-8 px-2 sm:px-4 flex flex-col items-center gap-4 sm:gap-6">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-center">Codenames Duet</h1>

      {/* Error display */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Message display */}
      {message && (
        <div className="bg-blue-100 border border-blue-300 text-blue-700 px-4 py-2 rounded-lg">
          {message}
        </div>
      )}

      {/* Game status */}
      <div className="text-center px-2">
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-2 flex-wrap">
          <div className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ${
            activePlayer === 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
          }`}>
            Player 1: {wordsRemaining[0]} words left
          </div>
          <div className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ${
            activePlayer === 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
          }`}>
            Player 2: {wordsRemaining[1]} words left
          </div>
        </div>
        <p className="text-xs sm:text-sm text-gray-600">
          Agents found: {agentsFound.total}/15 • Turn {turn + 1}
        </p>
      </div>

      {/* Token row */}
      <TokenBar tokens={tokens} />

      {/* Turn indicator */}
      <div className="text-center px-2">
        {isMyTurn ? (
          <div className="bg-green-100 border border-green-300 text-green-800 px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base">
            <span className="font-semibold">Your Turn!</span>
            {currentPhase === "clue" && " Give a clue."}
            {currentPhase === "guess" && " Make your guesses."}
          </div>
        ) : (
          <div className="bg-gray-100 border border-gray-300 text-gray-700 px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base">
            <span className="font-semibold">Player {activePlayer + 1}'s Turn</span>
            {currentPhase === "clue" && " - Giving a clue..."}
            {currentPhase === "guess" && " - Making guesses..."}
          </div>
        )}
      </div>

      {/* Current clue banner */}
      {clue && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 sm:px-4 py-2 rounded-lg mx-2 text-center">
          <span className="font-semibold">Clue:</span> "{clue.word}" ({clue.count})
        </div>
      )}

      {/* 5×5 board */}
      <Board
        board={board}
        privateKey={key}
        onGuess={sendGuess}
        disabled={!canGuess}
      />

      {/* End Turn button - visible when player can guess */}
      {canGuess && (
        <button
          onClick={sendEndTurn}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg px-4 sm:px-6 py-2 text-sm sm:text-base"
        >
          End Turn
        </button>
      )}

      {/* Clue form – visible only when you can give a clue */}
      {canGiveClue && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendClue(clueWord.trim(), Number(count));
            setClueWord("");
            setCount("");
          }}
          className="flex flex-col sm:flex-row items-center gap-2 mt-4 w-full max-w-sm sm:max-w-none px-2"
        >
          <div className="flex flex-col w-full sm:w-auto">
            <label className="text-xs sm:text-sm mb-1">Word</label>
            <input
              required
              value={clueWord}
              onChange={(e) => setClueWord(e.target.value)}
              className="rounded-lg border p-2 w-full sm:w-40 text-sm sm:text-base"
              placeholder="e.g. Ocean"
            />
          </div>
          <div className="flex flex-col w-full sm:w-auto">
            <label className="text-xs sm:text-sm mb-1">Count</label>
            <input
              required
              type="number"
              min="0"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="rounded-lg border p-2 w-full sm:w-20 text-sm sm:text-base"
            />
          </div>
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg px-4 py-2 mt-2 sm:mt-0 w-full sm:w-auto text-sm sm:text-base"
          >
            Send Clue
          </button>
        </form>
      )}

      {/* Help text */}
      <div className="text-center text-xs sm:text-sm text-gray-500 max-w-md px-4">
        {currentPhase === "clue" && isMyTurn && (
          <p>Give a one-word clue and number. Your partner will guess words related to your clue.</p>
        )}
        {currentPhase === "guess" && isMyTurn && (
          <p>Click on words that relate to the clue. Green outline = your agents, Red outline = assassins! Click "End Turn" when you're done guessing.</p>
        )}
        {!isMyTurn && (
          <p>Wait for your partner to {currentPhase === "clue" ? "give a clue" : "finish guessing"}.</p>
        )}
      </div>
    </div>
  );
}
