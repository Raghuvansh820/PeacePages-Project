// Constants for API Integration
const API_KEY = "AIzaSyDy_MS5uG9vk8QvxRSsYjFjjsWW_11qlxs";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

// In-memory storage for daily entries and therapy mode
const dailyEntries = {};
let therapyMode = false;

// Navigation Function
function goToScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.add("active");
  } else {
    console.error(`Screen with ID "${screenId}" not found.`);
  }
}

// Fetch Response from API
async function chatWithGoogle(prompt) {
  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (response.ok) {
      const reply = await response.json();
      if (reply.candidates) {
        return reply.candidates[0].content?.parts?.[0]?.text || "No response text found.";
      }
      return "No candidates found in response.";
    }
    return `Error: ${response.status}, ${await response.text()}`;
  } catch (error) {
    return `An error occurred: ${error.message}`;
  }
}

// Chatbot Logic
let conversation = [];

// Initialize Chatbox with Initial Message
function initializeChat() {
  therapyMode = false; // Reset therapy mode
  conversation = []; // Clear conversation history

  const chatbox = document.getElementById("chatbox");
  chatbox.innerHTML = ""; // Clear chatbox

  const initialMessage = document.createElement("div");
  initialMessage.className = "message bot";
  initialMessage.innerHTML = `<span>Hi! Before we begin, I can act as a therapy bot if you'd like. Would you like to talk to me today as a therapy bot? (yes/no)</span>`;
  chatbox.appendChild(initialMessage);

  // Add to conversation history
  conversation.push({ role: "chatbot", text: "Hi! Before we begin, I can act as a therapy bot if you'd like. Would you like to talk to me today as a therapy bot? (yes/no)" });
  chatbox.scrollTop = chatbox.scrollHeight; // Scroll to bottom
}

// Send User Message and Generate Response
async function sendMessage() {
  const userInput = document.getElementById("user-input").value.trim();
  if (!userInput) return;

  // Display User Message
  const chatbox = document.getElementById("chatbox");
  const userMessage = document.createElement("div");
  userMessage.className = "message user";
  userMessage.innerHTML = `<span>${userInput}</span>`;
  chatbox.appendChild(userMessage);

  // Save User Input
  conversation.push({ role: "user", text: userInput });
  document.getElementById("user-input").value = ""; // Clear input

  // Handle Initial Therapy Mode Decision
  if (conversation.length === 2 && userInput.toLowerCase() === "yes") {
    therapyMode = true;
  }

  if (conversation.length === 2 && userInput.toLowerCase() === "no") {
    therapyMode = false;
  }

  const botMessage = document.createElement("div");
  botMessage.className = "message bot";
  chatbox.appendChild(botMessage);

  // Generate Bot Response
  let prompt = userInput;
  if (therapyMode && conversation.length > 2) {
    prompt = `Respond to this in a therapeutic, empathetic way: ${userInput}`;
  }

  const botResponse = await chatWithGoogle(prompt);
  botMessage.innerHTML = `<span>${botResponse}</span>`;

  // Save Bot Response
  conversation.push({ role: "chatbot", text: botResponse });
  chatbox.scrollTop = chatbox.scrollHeight; // Scroll to bottom
}

// Summarize Conversation and Reset Chat
async function summarizeConversationAndReset() {
  if (conversation.length === 0) {
    alert("No conversation to summarize yet!");
    return;
  }

  const userMessages = conversation
    .filter((msg) => msg.role === "user")
    .map((msg) => msg.text)
    .join("\n");

  const summaryPrompt = `Summarize this user's messages for a diary entry:\n${userMessages}`;

  try {
    const summary = await chatWithGoogle(summaryPrompt);

    const todayDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    alert(`Summary of your conversation:\n${summary}`);

    // Send summary to the backend for saving
    await fetch('http://127.0.0.1:5000/save-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: todayDate, summary: summary })
    });

    // Reset conversation and restart chatbot
    conversation.length = 0;
    therapyMode = false;

    const chatbox = document.getElementById("chatbox");
    chatbox.innerHTML = "";

    const initialMessage =
      "Hi! Before we begin, I can act as a therapy bot if you'd like. Would you like to talk to me today as a therapy bot? (yes/no)";
    const botMessage = document.createElement("div");
    botMessage.className = "message bot";
    botMessage.innerHTML = `<span>${initialMessage}</span>`;
    chatbox.appendChild(botMessage);

    conversation.push({ role: "chatbot", text: initialMessage });
  } catch (error) {
    alert("An error occurred while summarizing the conversation. Please try again.");
    console.error(error);
  }
}

// Load Diary Entries
function goToDiary() {
  const diaryContainer = document.querySelector(".diary-entries");
  diaryContainer.innerHTML = ""; // Clear existing entries

  if (Object.keys(dailyEntries).length === 0) {
    diaryContainer.innerHTML = "<p>No diary entries yet. Start by writing one!</p>";
  } else {
    Object.entries(dailyEntries).forEach(([date, entry]) => {
      const entryDiv = document.createElement("div");
      entryDiv.className = "diary-entry";
      entryDiv.innerHTML = `<h2>${date}</h2><p>${entry}</p>`;
      diaryContainer.appendChild(entryDiv);
    });
  }

  goToScreen("diary-screen");
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  initializeChat(); // Start with the initial message
  document.getElementById("send-btn").addEventListener("click", sendMessage);
  document.getElementById("summarize-btn").addEventListener("click", summarizeConversationAndRestart);
});
// Load Diary Entries on Screen 3
function viewDiaryEntries() {
  fetch('http://127.0.0.1:5000/view-entries')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(entries => {
      const diaryScreen = document.getElementById('diary-screen');
      const diaryContainer = diaryScreen.querySelector('.diary-entries');
      diaryContainer.innerHTML = ''; // Clear previous entries

      entries.forEach(entry => {
        const diaryEntryDiv = document.createElement('div');
        diaryEntryDiv.className = 'diary-entry';
        diaryEntryDiv.innerHTML = `
          <h2>${entry.date}</h2>
          <p>${entry.entry}</p>
        `;
        diaryContainer.appendChild(diaryEntryDiv);
      });

      goToScreen('diary-screen');
    })
    .catch(error => {
      console.error('Error fetching diary entries:', error);
      alert('Could not load diary entries.');
    });
}
