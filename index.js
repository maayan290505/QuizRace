// --- Fixed index.js joinGame() ---

const firebaseConfig = {
  apiKey: "AIzaSyDzoLlTxlE6V7iW9zsAU66Ma5FiT42Ibu4",
  authDomain: "quiz-race-2e54c.firebaseapp.com",
  databaseURL: "https://quiz-race-2e54c-default-rtdb.firebaseio.com",
  projectId: "quiz-race-2e54c",
  storageBucket: "quiz-race-2e54c.appspot.com",
  messagingSenderId: "103582921392",
  appId: "1:103582921392:web:20c1fb0e2d9027a2d4c175"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function joinGame() {
  const username = document.getElementById('usernameInput').value.trim();
  if (!username) {
    alert('Please enter a username');
    return;
  }

  const playerRef = db.ref('players').push(); // ✅ Random ID

  localStorage.setItem('quiz_player_id', playerRef.key);
  localStorage.setItem('quiz_username', username);

  playerRef.set({
    username: username,
    score: 0,
    isPlaying: false
  }).then(() => {
    playerRef.onDisconnect().remove(); // Remove player on disconnect
    // ✅ Fix: switch correct screen id (index-screen)
    document.getElementById('index-screen').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('index-screen').style.display = 'none';
      const waiting = document.getElementById('waiting-screen');
      waiting.style.display = 'flex';
      waiting.style.opacity = '1';
    }, 300);

    document.getElementById('playerName').innerText = username;

    // Check how many players are connected
    setTimeout(() => {
      db.ref('players').once('value').then(snapshot => {
        const players = snapshot.val() || {};
        const playerCount = Object.keys(players).length;

        if (playerCount === 1) {
          showStartButton();
        }
      });
    }, 500);

    db.ref('players').on('value', snapshot => {
      const players = snapshot.val() || {};
      const connectedCount = Object.values(players).filter(p => p.username).length;
      document.getElementById('connectedCount').innerText = `Connected: ${connectedCount}`;
    });

    db.ref('game/isPlaying').on('value', snapshot => {
      if (snapshot.val() === true) {
        window.location.href = 'game.html';
      }
    });
  });
}

function showStartButton() {
  const startButton = document.createElement('button');
  startButton.innerText = 'Start Game';
  startButton.className = 'start-game-button';
  startButton.style.marginTop = '20px';
  startButton.style.backgroundColor = '#4CAF50';
  startButton.style.fontWeight = 'bold';
  startButton.style.padding = '12px 24px';
  startButton.style.fontSize = '1rem';

  startButton.onclick = () => {
    db.ref('game').update({ isPlaying: true });
  };

  const waitingScreen = document.getElementById('waiting-screen');
  waitingScreen.appendChild(startButton);
}

// Auto clean up when player leaves
window.addEventListener('beforeunload', () => {
  const playerId = localStorage.getItem('quiz_player_id');
  if (playerId) {
    db.ref('players/' + playerId).remove();
  }
});

// Initialize game state
function initializeGameState() {
  db.ref('game').once('value', snapshot => {
    const gameData = snapshot.val();

    if (!gameData || gameData.isPlaying === undefined || gameData.isFinished === undefined) {
      db.ref('game').update({
        isPlaying: false,
        isFinished: false
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initializeGameState();
});
