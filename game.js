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

let currentUsername = localStorage.getItem('quiz_username');
if (!currentUsername) {
  window.location.href = 'login.html';
}

const playerRef = db.ref('players/' + currentUsername);
playerRef.once('value').then(snapshot => {
  const existing = snapshot.val();
  if (!existing || !existing.username || typeof existing.score !== 'number') {
    playerRef.set({
      username: currentUsername,
      score: 0,
      isPlaying: true
    });
  } else {
    playerRef.update({ isPlaying: true });
  }
});

let allQuestions = [];
let currentQuestionIndex = 0;
let timerInterval = null;
let timeLeft = 10;
let currentScore = 0;
let selectedButton = null;

// Initialize user score in UI
updateScoreUI();

// Add background animation on load
window.addEventListener('DOMContentLoaded', () => {
  createBackgroundAnimation();

  // Show loading animation
  const quizScreen = document.getElementById('quiz-screen');
  quizScreen.innerHTML += `<div class="loading-container">
    <div class="loading-spinner"></div>
    <p>Loading quiz questions...</p>
  </div>`;
});

startWatcher();
loadQuestions();
listenForGameEnd();

function loadQuestions() {
  db.ref('game/questions').once('value').then(snapshot => {
    const data = snapshot.val();
    if (!data) {
      document.getElementById('question-text').innerText = "No questions found.";
      showNotification("No questions found. Please try again later.", "error");
      return;
    }

    allQuestions = Object.values(data);

    // Remove loading animation
    const loadingContainer = document.querySelector('.loading-container');
    if (loadingContainer) {
      loadingContainer.classList.add('fade-out');
      setTimeout(() => {
        loadingContainer.remove();
        showQuestion();
      }, 500);
    } else {
      showQuestion();
    }
  }).catch(error => {
    console.error("Error loading questions:", error);
    showNotification("Error loading questions. Please refresh and try again.", "error");
  });
}

function showQuestion() {
  const questionObj = allQuestions[currentQuestionIndex];
  if (!questionObj) return;

  // Create a container for the question with animation
  const questionContainer = document.getElementById('quiz-screen');
  questionContainer.classList.add('question-change');

  setTimeout(() => {
    document.getElementById('question-text').innerText = questionObj.question;
    document.getElementById('question-counter').innerText =
      `Question ${currentQuestionIndex + 1} of ${allQuestions.length}`;

    const answersDiv = document.getElementById('answers');
    answersDiv.innerHTML = '';

    questionObj.answers.forEach((answer, index) => {
      const btn = document.createElement('button');
      btn.innerText = answer;
      btn.dataset.index = index;

      btn.onclick = (e) => {
        // Prevent multiple clicks
        if (selectedButton) return;

        selectedButton = e.currentTarget;
        stopTimer();

        // Show visual feedback
        const buttons = document.querySelectorAll('#answers button');
        buttons.forEach(button => {
          button.classList.add('disabled');
          button.onclick = null;
        });

        const correctIndex = questionObj.correctIndex;

        if (index === correctIndex) {
          // Correct answer animation
          selectedButton.classList.add('correct-answer');
          playSound('correct');
          showNotification("Correct!", "success");
        } else {
          // Wrong answer animation
          selectedButton.classList.add('wrong-answer');

          // Show the correct answer
          buttons[correctIndex].classList.add('correct-answer');
          playSound('wrong');
          showNotification("Incorrect!", "error");
        }

        setTimeout(() => {
          handleAnswer(index);
          selectedButton = null;
        }, 1200);
      };

      answersDiv.appendChild(btn);
    });

    questionContainer.classList.remove('question-change');

    // Start progress bar animation
    const timerBar = document.createElement('div');
    timerBar.className = 'timer-bar';
    document.getElementById('timer').innerHTML = '';
    document.getElementById('timer').appendChild(timerBar);

    startTimer();
  }, 300);
}

function handleAnswer(selectedIndex) {
  const correctIndex = allQuestions[currentQuestionIndex].correctIndex;
  const isCorrect = selectedIndex === correctIndex;

  updateScore(isCorrect);

  currentQuestionIndex++;
  if (currentQuestionIndex < allQuestions.length) {
    showQuestion();
  } else {
    endGame();
  }
}
function updateScore(isCorrect) {
  const userRef = db.ref('players/' + currentUsername + '/score');
  userRef.transaction(score => {
    if (score === null) score = 0;
    return isCorrect ? score + 1 : score;
  }, function (error, committed, snapshot) {
    if (error) {
      console.error("Score transaction failed:", error);
      showNotification("Error updating score", "error");
      return;
    }

    currentScore = snapshot.val(); // Updated score
    updateScoreUI(isCorrect);

    // ✅ Proceed to next question or end game after score is committed
    if (currentQuestionIndex + 1 === allQuestions.length) {
      endGame();
    } else {
      currentQuestionIndex++;
      showQuestion();
    }
  });
}

function handleAnswer(selectedIndex) {
  const correctIndex = allQuestions[currentQuestionIndex].correctIndex;
  const isCorrect = selectedIndex === correctIndex;

  updateScore(isCorrect); // 🔄 logic now moved inside transaction callback
}

function updateScoreUI(isCorrect) {
  const scoreDisplay = document.getElementById('score-display');

  if (scoreDisplay) {
    scoreDisplay.innerText = `Score: ${currentScore}`;

    if (isCorrect === true) {
      scoreDisplay.classList.add('score-up');
      setTimeout(() => {
        scoreDisplay.classList.remove('score-up');
      }, 1000);
    } else if (isCorrect === false) {
      scoreDisplay.classList.add('score-shake');
      setTimeout(() => {
        scoreDisplay.classList.remove('score-shake');
      }, 500);
    }
  }
}

function endGame() {
  // 🔁 Re-fetch correct score from Firebase
  db.ref('players/' + currentUsername + '/score').once('value').then(snapshot => {
    currentScore = snapshot.val() || 0;

    db.ref('players/' + currentUsername).update({ isPlaying: false });

    const quizScreen = document.getElementById('quiz-screen');
    quizScreen.innerHTML = `
      <div class="end-game-container">
        <h2 class="slide-down">Quiz Completed!</h2>
        <div class="score-container">
          <p>Your final score</p>
          <div class="final-score">${currentScore}</div>
        </div>
        <p class="waiting-text">Waiting for others to finish...</p>
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    showConfetti();

    setTimeout(() => {
      const finalScore = document.querySelector('.final-score');
      if (finalScore) finalScore.classList.add('pulse');
    }, 500);
  });
}


function startTimer() {
  timeLeft = 10;
  const timerBar = document.querySelector('.timer-bar');
  if (timerBar) {
    timerBar.style.width = '100%';
    timerBar.classList.add('timer-animation');
  }

  timerInterval = setInterval(() => {
    timeLeft--;

    if (timeLeft <= 3 && timeLeft > 0) {
      playSound('tick');
    }

    if (timeLeft <= 0) {
      stopTimer();
      showNotification("Time's up!", "error");

      // Show the correct answer
      const correctIndex = allQuestions[currentQuestionIndex].correctIndex;
      const buttons = document.querySelectorAll('#answers button');

      buttons.forEach(button => {
        button.classList.add('disabled');
        button.onclick = null;
      });

      if (buttons[correctIndex]) {
        buttons[correctIndex].classList.add('correct-answer');
      }

      setTimeout(() => {
        handleAnswer(-1); // timeout = wrong answer
      }, 1200);
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  const timerBar = document.querySelector('.timer-bar');
  if (timerBar) {
    timerBar.classList.remove('timer-animation');
  }
}

function startWatcher() {
  setInterval(() => {
    db.ref('players').once('value').then(snapshot => {
      const players = snapshot.val() || {};
      const connectedPlayers = Object.values(players).filter(p => p.username);

      // Only consider setting isFinished if we have at least 2 players
      if (connectedPlayers.length >= 1) {
        // Check if all players have finished
        const allFinished = connectedPlayers.every(p => p.isPlaying === false);

        // We also need to check if the game was actually started
        db.ref('game/isPlaying').once('value').then(isPlayingSnap => {
          const gameWasStarted = isPlayingSnap.val() === true;

          // Only set isFinished to true if the game was started AND all players finished
          if (allFinished && gameWasStarted) {
            db.ref('game').update({
              isFinished: true,
              isPlaying: false
            });
          }
        });
      }
    });
  }, 3000);
}

// Also, we should modify the listenForGameEnd function to avoid false triggers
function listenForGameEnd() {
  db.ref('game').on('value', snapshot => {
    const gameData = snapshot.val() || {};

    // Only show leaderboard if isFinished is true AND we've actually completed a game
    if (gameData.isFinished === true && currentQuestionIndex > 0) {
      showLeaderboard();
    }
  });
}

function showLeaderboard() {
  // Add transition animation
  document.getElementById('quiz-screen').style.opacity = '0';

  setTimeout(() => {
    document.getElementById('quiz-screen').style.display = 'none';
    document.getElementById('leaderboard-screen').style.display = 'block';

    setTimeout(() => {
      document.getElementById('leaderboard-screen').style.opacity = '1';
    }, 100);
  }, 500);

  db.ref('players').once('value').then(snapshot => {
    const players = snapshot.val() || {};
    const sorted = Object.values(players).sort((a, b) => b.score - a.score);

    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';

    // Animate the title
    const leaderboardTitle = document.querySelector('#leaderboard-screen h2');
    if (leaderboardTitle) {
      leaderboardTitle.className = 'slide-down';
    }

    // Add confetti animation for winner
    if (sorted.length > 0 && sorted[0].username === currentUsername) {
      showConfetti();
      playSound('win');
    }

    sorted.forEach((player, index) => {
      const li = document.createElement('li');
      li.className = 'leaderboard-item';

      // Add crown icon for top 3
      let prefix = '';
      if (index === 0) {
        prefix = '<span class="crown gold">👑</span> ';
      } else if (index === 1) {
        prefix = '<span class="crown silver">🥈</span> ';
      } else if (index === 2) {
        prefix = '<span class="crown bronze">🥉</span> ';
      }

      // Highlight current user
      const isCurrentUser = player.username === currentUsername;
      if (isCurrentUser) {
        li.classList.add('current-user');
      }

      const scorePercentage = (player.score / allQuestions.length) * 100;

      li.innerHTML = `
        ${prefix}
        <div class="leaderboard-content">
          <div class="player-info">
            <span class="player-name">${player.username}</span>
            <span class="player-position">#${index + 1}</span>
          </div>
          <div class="score-bar-container">
            <div class="score-bar" style="width: ${scorePercentage}%"></div>
            <span class="player-score">${player.score} points</span>
          </div>
        </div>
      `;

      list.appendChild(li);

      // Add delay to create animation effect
      setTimeout(() => {
        li.classList.add('show');
      }, index * 150);
    });

    // Add replay button
    const replayButton = document.createElement('button');
    replayButton.innerText = 'Play Again';
    replayButton.className = 'replay-button';
    replayButton.onclick = () => {
      showNotification("Starting a new game...", "info");
      resetGame();
    };

    setTimeout(() => {
      document.getElementById('leaderboard-screen').appendChild(replayButton);
      replayButton.classList.add('show');
    }, sorted.length * 150 + 300);
  });
}

function resetGame() {
  // Reset game state in Firebase
  db.ref('game').update({
    isFinished: false,
    isPlaying: true
  });

  // Reset local game state
  currentQuestionIndex = 0;
  currentScore = 0;

  // Transition back to quiz screen
  document.getElementById('leaderboard-screen').style.opacity = '0';

  setTimeout(() => {
    document.getElementById('leaderboard-screen').style.display = 'none';
    document.getElementById('quiz-screen').style.display = 'block';
    document.getElementById('score-display').innerText = 'Score: 0';

    setTimeout(() => {
      document.getElementById('quiz-screen').style.opacity = '1';
      showQuestion();
    }, 100);
  }, 500);
}

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
    
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      opacity: 1;
      transition: opacity 0.5s ease;
    }
    
    .loading-container.fade-out {
      opacity: 0;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(33, 150, 243, 0.2);
      border-left-color: #2196f3;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }
    
    .timer-bar {
      height: 6px;
      background-color: #2196f3;
      border-radius: 3px;
      width: 100%;
    }
    
    .timer-animation {
      animation: timer 10s linear forwards;
    }
    
    .correct-answer {
      background-color: rgba(76, 175, 80, 0.8) !important;
      box-shadow: 0 0 10px rgba(76, 175, 80, 0.5) !important;
      transform: scale(1.03) !important;
    }
    
    .wrong-answer {
      background-color: rgba(244, 67, 54, 0.8) !important;
      box-shadow: 0 0 10px rgba(244, 67, 54, 0.5) !important;
    }
    
    .disabled {
      opacity: 0.7;
      pointer-events: none;
    }
    
    .question-change {
      animation: fadeToRight 0.3s ease;
    }
    
    .score-up {
      animation: scoreUp 1s ease;
      color: #4CAF50;
    }
    
    .score-shake {
      animation: shake 0.5s ease;
    }
    
    .end-game-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    
    .score-container {
      margin: 2rem 0;
    }
    
    .final-score {
      font-size: 4rem;
      font-weight: bold;
      color: #2196f3;
      margin: 1rem;
      opacity: 0;
      transform: scale(0.5);
      transition: all 0.5s ease;
    }
    
    .final-score.pulse {
      opacity: 1;
      transform: scale(1);
      animation: pulse 2s infinite;
    }
    
    .waiting-text {
      margin-bottom: 1rem;
      color: var(--text-secondary);
    }
    
    .loading-dots {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .loading-dots span {
      width: 8px;
      height: 8px;
      margin: 0 4px;
      background-color: var(--primary);
      border-radius: 50%;
      display: inline-block;
      animation: dots 1.4s infinite ease-in-out both;
    }
    
    .loading-dots span:nth-child(1) {
      animation-delay: -0.32s;
    }
    
    .loading-dots span:nth-child(2) {
      animation-delay: -0.16s;
    }
    
    .leaderboard-item {
      opacity: 0;
      transform: translateX(-20px);
      transition: all 0.3s ease;
    }
    
    .leaderboard-item.show {
      opacity: 1;
      transform: translateX(0);
    }
    
    .leaderboard-content {
      display: flex;
      flex-direction: column;
      width: 100%;
    }
    
    .player-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.3rem;
    }
    
    .player-name {
      font-weight: bold;
    }
    
    .player-position {
      color: var(--text-secondary);
    }
    
    .current-user {
      background: linear-gradient(90deg, rgba(33, 150, 243, 0.1), rgba(33, 150, 243, 0));
      border-left: 3px solid var(--primary);
    }
    
    .score-bar-container {
      position: relative;
      height: 10px;
      background-color: var(--surface-2);
      border-radius: 5px;
      overflow: hidden;
      margin-top: 0.5rem;
    }
    
    .score-bar {
      height: 100%;
      background-color: var(--primary);
      border-radius: 5px;
      transition: width 1s ease-out;
    }
    
    .player-score {
      position: absolute;
      right: 0;
      top: -18px;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }
    
    .crown {
      font-size: 1.2rem;
      margin-right: 0.5rem;
      position: relative;
      top: 0.1rem;
    }
    
    .replay-button {
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s ease;
      margin-top: 2rem;
    }
    
    .replay-button.show {
      opacity: 1;
      transform: translateY(0);
    }
    
    .notification {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(10px);
      background-color: #333;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      opacity: 0;
      transition: all 0.3s ease;
    }
    
    .notification.success {
      background-color: #4CAF50;
    }
    
    .notification.error {
      background-color: #F44336;
    }
    
    .notification.info {
      background-color: #2196F3;
    }
    
    @keyframes fadeToRight {
      0% {
        opacity: 1;
        transform: translateX(0);
      }
      50% {
        opacity: 0.3;
        transform: translateX(20px);
      }
      51% {
        opacity: 0.3;
        transform: translateX(-20px);
      }
      100% {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes scoreUp {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.3);
      }
      100% {
        transform: scale(1);
      }
    }
    
    @keyframes shake {
      0%, 100% {
        transform: translateX(0);
      }
      25% {
        transform: translateX(-5px);
      }
      75% {
        transform: translateX(5px);
      }
    }
    
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    
    @keyframes timer {
      0% {
        width: 100%;
        background-color: #2196f3;
      }
      70% {
        background-color: #FFC107;
      }
      90% {
        background-color: #F44336;
      }
      100% {
        width: 0%;
        background-color: #F44336;
      }
    }
    
    @keyframes dots {
      0%, 80%, 100% {
        transform: scale(0);
      }
      40% {
        transform: scale(1);
      }
    }
    
    .confetti {
      position: fixed;
      width: 10px;
      height: 10px;
      background-color: #f00;
      clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
      animation: fall 5s linear forwards;
      z-index: 1000;
    }
    
    @keyframes fall {
      0% {
        transform: translateY(-100vh) rotate(0deg);
        opacity: 1;
      }
      
      70% {
        opacity: 1;
      }
      
      100% {
        transform: translateY(100vh) rotate(540deg);
        opacity: 0;
      }
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

function showConfetti() {
  // Create confetti particles
  for (let i = 0; i < 100; i++) {
    createConfetti();
  }
}

function createConfetti() {
  const confetti = document.createElement('div');
  confetti.className = 'confetti';

  // Random size
  const size = Math.random() * 10 + 5;

  // Random position
  const posX = Math.random() * 100;

  // Random color
  const colors = ['#2196F3', '#4CAF50', '#FFC107', '#F44336', '#9C27B0', '#FFEB3B'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  // Random rotation
  const rotation = Math.random() * 360;

  // Random animation duration
  const duration = Math.random() * 3 + 2;

  // Set styles
  confetti.style.width = `${size}px`;
  confetti.style.height = `${size}px`;
  confetti.style.left = `${posX}%`;
  confetti.style.top = '-20px';
  confetti.style.backgroundColor = color;
  confetti.style.transform = `rotate(${rotation}deg)`;
  confetti.style.animationDuration = `${duration}s`;

  document.body.appendChild(confetti);

  // Remove after animation completes
  setTimeout(() => {
    confetti.remove();
  }, duration * 1000);
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
    notification.style.transform = 'translateX(-50%) translateY(0)';
  }, 10);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Audio for game effects
const sounds = {
  correct: 'https://assets.mixkit.co/sfx/preview/mixkit-game-success-alert-2039.mp3',
  wrong: 'https://assets.mixkit.co/sfx/preview/mixkit-game-error-alert-2029.mp3',
  tick: 'https://assets.mixkit.co/sfx/preview/mixkit-short-click-delay-1097.mp3',
  win: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3'
};

let audioEnabled = true;

function playSound(type) {
  if (!audioEnabled) return;

  const audio = new Audio(sounds[type]);
  audio.volume = type === 'tick' ? 0.3 : 0.5;
  audio.play().catch(e => console.log('Audio play failed:', e));
}

// Add sound toggle
window.addEventListener('DOMContentLoaded', () => {
  const soundButton = document.createElement('button');
  soundButton.className = 'sound-toggle';
  soundButton.innerHTML = '🔊';
  soundButton.title = 'Toggle sound effects';
  soundButton.style.position = 'fixed';
  soundButton.style.bottom = '10px';
  soundButton.style.right = '10px';
  soundButton.style.width = '40px';
  soundButton.style.height = '40px';
  soundButton.style.borderRadius = '50%';
  soundButton.style.padding = '0';
  soundButton.style.fontSize = '1.2rem';

  soundButton.onclick = () => {
    audioEnabled = !audioEnabled;
    soundButton.innerHTML = audioEnabled ? '🔊' : '🔇';
    showNotification(`Sound ${audioEnabled ? 'enabled' : 'disabled'}`, 'info');
  };

  document.body.appendChild(soundButton);
});

// Clean up when leaving the page
window.addEventListener('beforeunload', () => {
  db.ref('players/' + currentUsername).update({ isPlaying: false });
});