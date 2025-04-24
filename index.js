const firebaseConfig = {
  apiKey: "AIzaSyDzoLlTxlE6V7iW9zsAU66Ma5FiT42Ibu4",
  authDomain: "quiz-race-2e54c.firebaseapp.com",
  databaseURL: "https://quiz-race-2e54c-default-rtdb.firebaseio.com",
  projectId: "quiz-race-2e54c",
  storageBucket: "quiz-race-2e54c.firebasestorage.app",
  messagingSenderId: "103582921392",
  appId: "1:103582921392:web:20c1fb0e2d9027a2d4c175"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentUsername = null;

// Add loading animations
window.addEventListener('DOMContentLoaded', () => {
  // Add subtle background animation
  createBackgroundAnimation();

  // Add input animation on focus
  const usernameInput = document.getElementById('usernameInput');
  if (usernameInput) {
    usernameInput.addEventListener('focus', () => {
      document.getElementById('index-screen').classList.add('focused');
    });

    usernameInput.addEventListener('blur', () => {
      document.getElementById('index-screen').classList.remove('focused');
    });

    // Auto-focus the username input for better UX
    setTimeout(() => usernameInput.focus(), 500);
  }
});

function createBackgroundAnimation() {
  const app = document.getElementById('app');

  // Create a container for the particles
  const particlesContainer = document.createElement('div');
  particlesContainer.className = 'particles-container';

  // Add a style element for the particles
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .particles-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      z-index: -1;
    }
    
    .particle {
      position: absolute;
      background: rgba(33, 150, 243, 0.3);
      border-radius: 50%;
      pointer-events: none;
    }
  `;

  document.head.appendChild(styleElement);
  app.prepend(particlesContainer);

  // Create some particles
  for (let i = 0; i < 15; i++) {
    createParticle(particlesContainer);
  }
}

function createParticle(container) {
  const particle = document.createElement('div');
  particle.className = 'particle';

  // Random size between 2px and 8px
  const size = Math.random() * 6 + 2;

  // Random position
  const posX = Math.random() * 100;
  const posY = Math.random() * 100;

  // Random opacity
  const opacity = Math.random() * 0.5 + 0.1;

  // Random animation duration between 15s and 40s
  const duration = Math.random() * 25 + 15;

  // Set styles
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  particle.style.left = `${posX}%`;
  particle.style.top = `${posY}%`;
  particle.style.opacity = opacity;

  // Add animation
  particle.style.animation = `floatParticle ${duration}s linear infinite`;

  container.appendChild(particle);

  // Add the keyframes if they don't exist yet
  if (!document.querySelector('#particle-keyframes')) {
    const keyframes = document.createElement('style');
    keyframes.id = 'particle-keyframes';
    keyframes.textContent = `
      @keyframes floatParticle {
        0% {
          transform: translate(0, 0) rotate(0deg);
        }
        25% {
          transform: translate(${Math.random() * 30 - 15}px, ${Math.random() * 30 - 15}px) rotate(90deg);
        }
        50% {
          transform: translate(${Math.random() * 30 - 15}px, ${Math.random() * 30 - 15}px) rotate(180deg);
        }
        75% {
          transform: translate(${Math.random() * 30 - 15}px, ${Math.random() * 30 - 15}px) rotate(270deg);
        }
        100% {
          transform: translate(0, 0) rotate(360deg);
        }
      }
    `;
    document.head.appendChild(keyframes);
  }
}
function joinGame() {
  const username = document.getElementById('usernameInput').value.trim();
  if (!username) {
    showNotification('Please enter a username', 'error');
    return;
  }

  // Save username in localStorage for use in game.js
  localStorage.setItem('quiz_username', username);
  currentUsername = username;

  // Show loading
  document.getElementById('usernameInput').disabled = true;
  const joinButton = document.querySelector('button');
  joinButton.innerHTML = '<span class="loader"></span> Joining...';
  joinButton.disabled = true;

  const playerRef = db.ref('players/' + username);
  playerRef.once('value').then(snapshot => {
    if (!snapshot.exists()) {
      return playerRef.set({
        username: username,
        score: 0,
        isPlaying: false
      });
    } else {
      return playerRef.update({ username }); // ensure username always exists
    }
  }).then(() => {
    // Transition to waiting screen
    document.getElementById('index-screen').style.opacity = '0';
    setTimeout(() => {
      document.getElementById('index-screen').style.display = 'none';
      const waiting = document.getElementById('waiting-screen');
      waiting.style.display = 'flex';
      waiting.style.flexDirection = 'column';
      waiting.style.alignItems = 'center';
      waiting.style.justifyContent = 'center';
      setTimeout(() => {
        waiting.style.opacity = '1';
      }, 50);
    }, 300);

    document.getElementById('playerName').innerText = username;

    db.ref('players').once('value').then(snapshot => {
      const players = snapshot.val() || {};
      const playerCount = Object.keys(players).length;

      if (playerCount === 1) {
        showStartButton(); // 👇 call function to show button
      }
    });

    // Add spinner
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'loading-dots';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      loadingSpinner.appendChild(dot);
    }
    document.getElementById('waiting-screen').appendChild(loadingSpinner);

    // Start the realtime listener
    db.ref('players').on('value', snapshot => {
      const players = snapshot.val() || {};
      const connectedCount = Object.values(players).filter(p => p.username).length;
      document.getElementById('connectedCount').innerText = `Connected: ${connectedCount}`;
    });


    // Listen for game start
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


// Utility function to show notifications
function showNotification(message, type = 'info') {
  // Remove any existing notifications
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Add animation
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Add a window event listener to clean up the DB when user leaves
window.addEventListener('beforeunload', () => {
  if (currentUsername) {
    // Use setWithPriority to make this execute before the page unloads
    db.ref('players/' + currentUsername).remove();
  }
});

function initializeGameState() {
  db.ref('game').once('value', snapshot => {
    const gameData = snapshot.val();

    // If game data doesn't exist or is missing key properties, initialize it
    if (!gameData || gameData.isPlaying === undefined || gameData.isFinished === undefined) {
      db.ref('game').update({
        isPlaying: false,
        isFinished: false
      });
      console.log("Game state initialized");
    }
  });
}

// Call this function when the app starts
document.addEventListener('DOMContentLoaded', () => {
  initializeGameState();
});