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

// Tabs
document.querySelectorAll(".tab-button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
    button.classList.add("active");
    document.getElementById("tab-" + button.dataset.tab).classList.add("active");
  });
});

// Add Question
document.getElementById("add-question").addEventListener("click", () => {
  const questionText = document.getElementById("question-text").value.trim();
  const answers = [
    document.getElementById("answer0").value,
    document.getElementById("answer1").value,
    document.getElementById("answer2").value,
    document.getElementById("answer3").value
  ];
  const correct = document.querySelector('input[name="correct"]:checked');

  if (!questionText || answers.some(a => !a) || !correct) {
    alert("Fill all fields and select correct answer.");
    return;
  }

  db.ref("game/questions").push({
    question: questionText,
    answers,
    correctIndex: parseInt(correct.value)
  });

  document.getElementById("question-text").value = "";
  answers.forEach((_, i) => document.getElementById("answer" + i).value = "");
  correct.checked = false;
});

// Load Questions
db.ref("game/questions").on("value", snapshot => {
  const questions = snapshot.val() || {};
  const list = document.getElementById("question-list");
  list.innerHTML = "";
  Object.values(questions).forEach(q => {
    const li = document.createElement("li");
    li.textContent = q.question + " (Correct: " + q.answers[q.correctIndex] + ")";
    list.appendChild(li);
  });
});

// Show players
db.ref("players").on("value", snapshot => {
  const players = snapshot.val() || {};
  const list = document.getElementById("player-list");
  list.innerHTML = "";
  Object.values(players).forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p.username} - Score: ${p.score}`;
    list.appendChild(li);
  });
});

// Game Control
document.getElementById("game-status").addEventListener("change", (e) => {
  db.ref("game/isPlaying").set(e.target.checked);
});
document.getElementById("reset-game").addEventListener("click", () => {
  db.ref("game").set({ isPlaying: false, isFinished: false });
  db.ref("players").remove();
  alert("Game reset.");
});
