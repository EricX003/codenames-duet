export function generateGame(words) {
  const shuffle = (a) => a.sort(() => Math.random() - 0.5);
  const boardWords = shuffle([...words]).slice(0, 25);

  // Generate roles according to Codenames Duet rules:
  // - 15 total agents (9 per side with 3 overlapping)
  // - 3 assassins per side (1 shared, others are agents/bystanders)
  // - Rest are bystanders
  const roles = generateDuetRoles();

  const tokens = { bank: 9, used: 0 }; // Change used from array to simple counter

  return {
    publicBoard: boardWords.map((w, i) => ({ 
      word: w, 
      revealed: false,
      color: null // Will be set when revealed
    })),
    privateKeys: [
      roles.map(r => r.side0), // Player 0's view
      roles.map(r => r.side1)  // Player 1's view
    ],
    roles, // Store the original roles for victory calculation
    tokens,
    turn: 0,
    currentPhase: "clue", // "clue" or "guess"
    activePlayer: 0, // Who should be active (giving clue or guessing)
    gameOver: false,
    victory: false,
    
    reveal(idx, playerWhoGuessed) {
      if (this.gameOver) return { result: "gameOver", message: "Game is already over" };
      
      const card = this.publicBoard[idx];
      if (card.revealed) return { result: "alreadyRevealed", message: "Card already revealed" };
      
      // Check if it's the correct player's turn to guess
      if (this.currentPhase !== "guess") {
        return { result: "wrongPhase", message: "Not in guessing phase" };
      }
      
      if (playerWhoGuessed !== this.activePlayer) {
        return { result: "wrongPlayer", message: "Not your turn to guess" };
      }
      
      // The other player's key determines what this card is
      const otherPlayer = 1 - playerWhoGuessed;
      const cardType = this.privateKeys[otherPlayer][idx];
      
      card.revealed = true;
      card.color = cardType;
      
      console.log(`Card ${idx} (${card.word}) revealed as ${cardType} by player ${playerWhoGuessed}`);
      
      if (cardType === "assassin") {
        // Game over - hit assassin
        this.gameOver = true;
        this.victory = false;
        console.log("Game over: Assassin hit!");
        return { result: "assassin", gameOver: true };
      }
      
      if (cardType === "agent") {
        // Check victory condition using the original roles
        const agentsFound = this.countAgentsFound();
        console.log(`Agent found! Total agents: ${agentsFound.total}/15 (Player 0: ${agentsFound.player0}/9, Player 1: ${agentsFound.player1}/9, Shared: ${agentsFound.shared}/3)`);
        
        if (agentsFound.total >= 15) {
          this.gameOver = true;
          this.victory = true;
          console.log("🎉 Victory! All 15 agents found!");
          return { result: "victory", gameOver: true };
        }
        
        // Check if the clue-giver (otherPlayer) has found all their words
        const clueGiverWordsRemaining = this.getPlayerWordsRemaining(otherPlayer);
        console.log(`Clue-giver (Player ${otherPlayer}) has ${clueGiverWordsRemaining} words remaining`);
        
        if (clueGiverWordsRemaining === 0) {
          console.log(`Player ${otherPlayer} has found all their words! Ending turn.`);
          return { result: "agent", endTurn: true, completedWords: true };
        }
        
        // Continue guessing - don't change phase or active player
        // Fixed
        return { result: "agent", continueGuessing: true };
      }
      
      // Bystander - end turn and use token
      console.log(`Bystander hit. Turn ending.`);
      
      // End the current turn
      return { result: "bystander", endTurn: true };
    },
    
    countAgentsFound() {
      let player0Found = 0;
      let player1Found = 0;
      let sharedFound = 0;
      let totalFound = 0;
      
      for (let i = 0; i < 25; i++) {
        const card = this.publicBoard[i];
        if (card.revealed && card.color === "agent") {
          const isPlayer0Agent = this.roles[i].side0 === "agent";
          const isPlayer1Agent = this.roles[i].side1 === "agent";
          
          if (isPlayer0Agent && isPlayer1Agent) {
            sharedFound++;
          } else if (isPlayer0Agent) {
            player0Found++;
          } else if (isPlayer1Agent) {
            player1Found++;
          }
          totalFound++;
        }
      }
      
      return {
        player0: player0Found + sharedFound,
        player1: player1Found + sharedFound,
        shared: sharedFound,
        total: totalFound
      };
    },
    
    getPlayerWordsRemaining(playerIdx) {
      let remaining = 0;
      for (let i = 0; i < 25; i++) {
        const card = this.publicBoard[i];
        if (!card.revealed && this.privateKeys[playerIdx][i] === "agent") {
          remaining++;
        }
      }
      return remaining;
    },
    
    endTurn() {
      // Use one timer token for this turn (happens regardless of how turn ended)
      this.tokens.used++;
      console.log(`Turn ended. Tokens used: ${this.tokens.used}/${this.tokens.bank}`);
      
      // Check if we've run out of time after using the token
      if (this.tokens.used >= this.tokens.bank && !this.gameOver) {
        this.gameOver = true;
        this.victory = false;
        console.log("Game over: Out of time!");
        return { result: "timeout", gameOver: true };
      }
      
      // The current active player (who was guessing) now becomes the clue-giver
      // Don't switch activePlayer - just change phase to "clue"
      this.currentPhase = "clue";
      this.turn++;
      
      // Check if the current active player has any words left to give clues for
      const wordsRemaining = this.getPlayerWordsRemaining(this.activePlayer);
      console.log(`Player ${this.activePlayer} has ${wordsRemaining} words remaining`);
      
      if (wordsRemaining === 0) {
        console.log(`Player ${this.activePlayer} has no words left, skipping their turn`);
        // Skip this player's turn - switch to the other player
        this.activePlayer = 1 - this.activePlayer;
        
        // Check if the other player also has no words
        const otherWordsRemaining = this.getPlayerWordsRemaining(this.activePlayer);
        if (otherWordsRemaining === 0) {
          console.log("Both players have found all their words! This shouldn't happen if victory condition works.");
          this.gameOver = true;
          this.victory = true;
          return { result: "victory", gameOver: true };
        }
      }
      
      return { result: "continue", activePlayer: this.activePlayer, phase: this.currentPhase };
    },
    
    giveClue(playerIdx, clueWord, count) {
      if (this.gameOver) return { result: "gameOver", message: "Game is already over" };
      
      if (this.currentPhase !== "clue") {
        return { result: "wrongPhase", message: "Not in clue-giving phase" };
      }
      
      if (playerIdx !== this.activePlayer) {
        return { result: "wrongPlayer", message: "Not your turn to give a clue" };
      }
      
      console.log(`Player ${playerIdx} gave clue: ${clueWord} (${count})`);
      
      // Switch to guessing phase for the other player
      this.activePlayer = 1 - this.activePlayer;
      this.currentPhase = "guess";
      
      return { 
        result: "success", 
        activePlayer: this.activePlayer, 
        phase: this.currentPhase,
        clue: { word: clueWord, count }
      };
    },
    
    publicSnapshot() {
      const agentsFound = this.countAgentsFound();
      
      return {
        board: this.publicBoard,
        tokens: {
          bank: this.tokens.bank,
          used: this.tokens.used
        },
        turn: this.turn,
        activePlayer: this.activePlayer,
        currentPhase: this.currentPhase,
        gameOver: this.gameOver,
        victory: this.victory,
        agentsFound,
        wordsRemaining: [
          this.getPlayerWordsRemaining(0),
          this.getPlayerWordsRemaining(1)
        ]
      };
    }
  };
}

function generateDuetRoles() {
  // Create array of 25 positions
  const roles = Array(25).fill(null).map(() => ({
    side0: "bystander",
    side1: "bystander"
  }));
  
  // Randomly select positions for different role types
  const positions = Array.from({length: 25}, (_, i) => i);
  shuffle(positions);
  
  let pos = 0;
  
  // 3 words that are agents on both sides (the overlap)
  for (let i = 0; i < 3; i++) {
    roles[positions[pos]].side0 = "agent";
    roles[positions[pos]].side1 = "agent";
    pos++;
  }
  
  // 6 words that are agents only on side 0
  for (let i = 0; i < 6; i++) {
    roles[positions[pos]].side0 = "agent";
    pos++;
  }
  
  // 6 words that are agents only on side 1
  for (let i = 0; i < 6; i++) {
    roles[positions[pos]].side1 = "agent";
    pos++;
  }
  
  // 1 word that is assassin on both sides
  roles[positions[pos]].side0 = "assassin";
  roles[positions[pos]].side1 = "assassin";
  pos++;
  
  // 2 words that are assassins only on side 0
  for (let i = 0; i < 2; i++) {
    roles[positions[pos]].side0 = "assassin";
    pos++;
  }
  
  // 2 words that are assassins only on side 1
  for (let i = 0; i < 2; i++) {
    roles[positions[pos]].side1 = "assassin";
    pos++;
  }
  
  // Log the setup for debugging
  const side0Agents = roles.filter(r => r.side0 === "agent").length;
  const side1Agents = roles.filter(r => r.side1 === "agent").length;
  const overlapAgents = roles.filter(r => r.side0 === "agent" && r.side1 === "agent").length;
  const totalUniqueAgents = side0Agents + side1Agents - overlapAgents;
  
  console.log(`Game setup: Side0 agents: ${side0Agents}, Side1 agents: ${side1Agents}, Overlap: ${overlapAgents}, Total unique: ${totalUniqueAgents}`);
  
  return roles;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
