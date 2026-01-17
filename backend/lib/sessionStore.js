const fs = require("fs");
const path = require("path");

const SESSION_FILE = path.join(__dirname, "..", "sessions.json");

const loadSession = () => {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const data = fs.readFileSync(SESSION_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load session:", e);
  }
  return null;
};

const saveSession = (data) => {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed to save session:", e);
  }
};

module.exports = { loadSession, saveSession };
