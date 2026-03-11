# School Schedule Voice Assistant — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a voice-first PWA that answers school schedule questions instantly with beautiful card-based UI, plus Siri Shortcuts integration.

**Architecture:** Plain HTML/CSS/JS PWA. Voice input via Web Speech API, natural language parsed with regex pattern matching, answers rendered as animated cards. Config stored in localStorage with Garden City as hardcoded default. Hosted on Vercel via GitHub.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript, Web Speech API, Service Workers, Vercel hosting

**Design Doc:** `docs/plans/2026-03-11-school-schedule-voice-assistant-design.md`

---

## Task 1: Project Scaffolding & Default Config

**Files:**
- Create: `config-default.json`
- Create: `js/config.js`
- Create: `index.html` (minimal shell)

**Step 1: Create the default config JSON**

Create `config-default.json` with the full Garden City district config:

```json
{
  "districtName": "Garden City",
  "districtLogo": null,
  "voiceResponseEnabled": true,
  "darkMode": false,
  "levels": [
    {
      "id": "primary",
      "name": "Primary",
      "accentColor": "#4CAF50",
      "aliases": ["Locust", "Hemlock", "Homestead", "Locust School", "Hemlock School", "Homestead School", "primary"],
      "schedule": {
        "Period 1": ["08:15", "09:00"],
        "Period 2": ["09:00", "09:40"],
        "Period 3": ["09:40", "10:20"],
        "Period 4": ["10:20", "11:00"],
        "Period 5": ["11:00", "11:40"],
        "Period 6": ["11:45", "12:35"],
        "Period 7": ["12:40", "13:30"],
        "Period 8": ["13:00", "13:40"],
        "Period 9": ["13:40", "14:20"],
        "Period 10": ["14:20", "15:00"]
      }
    },
    {
      "id": "elementary",
      "name": "Elementary",
      "accentColor": "#FF9800",
      "aliases": ["Stratford", "Stratford Avenue School", "Stratford School", "Stewart", "Stewart School", "elementary"],
      "schedule": {
        "Period 1": ["07:58", "08:38"],
        "Period 2": ["08:38", "09:18"],
        "Period 3": ["09:21", "10:01"],
        "Period 4": ["10:04", "10:44"],
        "Period 5": ["10:47", "11:23"],
        "Period 6": ["11:26", "12:16"],
        "Period 7": ["12:20", "13:10"],
        "Period 8": ["13:13", "13:53"],
        "Period 9": ["13:56", "14:36"],
        "Period 10": ["14:40", "14:55"]
      }
    },
    {
      "id": "middle",
      "name": "Middle School",
      "accentColor": "#2196F3",
      "aliases": ["Garden City Middle School", "GCMS", "the middle school", "middle school", "middle"],
      "schedule": {
        "Period 1": ["08:29", "09:15"],
        "Period 2": ["09:19", "10:00"],
        "Period 3": ["10:04", "10:45"],
        "Period 4": ["10:49", "11:30"],
        "Period 5": ["11:34", "12:15"],
        "Period 6": ["12:19", "13:00"],
        "Period 7": ["13:04", "13:45"],
        "Period 8": ["13:49", "14:30"],
        "Period 9": ["14:34", "15:17"],
        "Period 10": ["15:20", "15:30"]
      }
    },
    {
      "id": "high",
      "name": "High School",
      "accentColor": "#F44336",
      "aliases": ["Garden City High School", "GCHS", "the high school", "high school", "high"],
      "schedule": {
        "Period 1": ["07:40", "08:27"],
        "Period 2": ["08:32", "09:14"],
        "Period 3": ["09:19", "10:01"],
        "Period 4": ["10:06", "10:48"],
        "Period 5": ["10:53", "11:35"],
        "Period 6": ["11:40", "12:22"],
        "Period 7": ["12:27", "13:09"],
        "Period 8": ["13:14", "13:56"],
        "Period 9": ["14:01", "14:43"],
        "Period 10": ["14:43", "14:55"]
      }
    }
  ]
}
```

**Step 2: Create config.js — config loader with localStorage + default fallback**

Create `js/config.js`:

```javascript
// Config module — loads from localStorage, falls back to default
const Config = (() => {
  const STORAGE_KEY = 'schedule-assistant-config';

  let _defaultConfig = null;

  async function loadDefault() {
    if (_defaultConfig) return _defaultConfig;
    const resp = await fetch('config-default.json');
    _defaultConfig = await resp.json();
    return _defaultConfig;
  }

  async function get() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // Corrupted — fall back to default
      }
    }
    return await loadDefault();
  }

  function save(config) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  function exportJSON(config) {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.districtName || 'schedule'}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target.result);
          if (!config.levels || !Array.isArray(config.levels)) {
            reject(new Error('Invalid config: missing levels array'));
            return;
          }
          save(config);
          resolve(config);
        } catch (err) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.readAsText(file);
    });
  }

  async function reset() {
    localStorage.removeItem(STORAGE_KEY);
    return await loadDefault();
  }

  return { get, save, exportJSON, importJSON, reset, loadDefault };
})();
```

**Step 3: Create minimal index.html shell**

Create `index.html` — just enough to verify config loads:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Schedule Assistant</title>
  <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div id="app">
    <header id="header"></header>
    <main id="main"></main>
    <section id="cards"></section>
  </div>
  <script src="js/config.js"></script>
</body>
</html>
```

**Step 4: Create directory structure**

```bash
mkdir -p css js assets
```

**Step 5: Create placeholder style.css**

Create `css/style.css`:

```css
/* Schedule Assistant — Base Styles */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg: #f8f9fa;
  --bg-card: #ffffff;
  --text: #1a1a2e;
  --text-secondary: #6c757d;
  --shadow: rgba(0, 0, 0, 0.08);
}

body {
  font-family: 'Lexend', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  justify-content: center;
  -webkit-font-smoothing: antialiased;
}

body.dark-mode {
  --bg: #1a1a2e;
  --bg-card: #16213e;
  --text: #e8e8e8;
  --text-secondary: #a0a0b0;
  --shadow: rgba(0, 0, 0, 0.3);
}

#app {
  width: 100%;
  max-width: 480px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  min-height: 100dvh;
}
```

**Step 6: Verify by opening index.html in browser**

Open the file — should see a blank white page with Lexend font loading. Open devtools console, run:
```javascript
Config.get().then(c => console.log(c.districtName))
```
Expected: `"Garden City"`

**Step 7: Commit**

```bash
git init
git add config-default.json js/config.js index.html css/style.css
git commit -m "feat: project scaffolding with config system and Garden City defaults"
```

---

## Task 2: Schedule Engine

**Files:**
- Create: `js/schedule-engine.js`

**Step 1: Create schedule-engine.js with all three lookup functions**

Create `js/schedule-engine.js`:

```javascript
// Schedule Engine — three lookup types
const ScheduleEngine = (() => {

  // Convert "13:45" or "1:45" to minutes since midnight (for comparison)
  function toMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  // Format 24h time to 12h display: "13:45" → "1:45 PM"
  function formatTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  }

  // Find which level a school name/alias belongs to
  function findLevel(config, schoolQuery) {
    const q = schoolQuery.toLowerCase().trim();
    for (const level of config.levels) {
      if (level.name.toLowerCase() === q || level.id.toLowerCase() === q) {
        return level;
      }
      for (const alias of level.aliases) {
        if (alias.toLowerCase() === q) {
          return level;
        }
      }
    }
    // Fuzzy: check if query contains any alias or vice versa
    for (const level of config.levels) {
      if (q.includes(level.name.toLowerCase()) || level.name.toLowerCase().includes(q)) {
        return level;
      }
      for (const alias of level.aliases) {
        if (q.includes(alias.toLowerCase()) || alias.toLowerCase().includes(q)) {
          return level;
        }
      }
    }
    return null;
  }

  // Query type 1: What time is period X at school Y?
  // Returns: { period, start, end, startFormatted, endFormatted, level }
  function getPeriodTime(config, schoolQuery, periodNum) {
    const level = findLevel(config, schoolQuery);
    if (!level) return { error: `I couldn't find a school matching "${schoolQuery}".` };

    const periodKey = `Period ${periodNum}`;
    const times = level.schedule[periodKey];
    if (!times) return { error: `Period ${periodNum} doesn't exist at ${level.name}.` };

    return {
      period: periodKey,
      start: times[0],
      end: times[1],
      startFormatted: formatTime(times[0]),
      endFormatted: formatTime(times[1]),
      level: level
    };
  }

  // Query type 2: What period is it NOW at school Y?
  // Returns: { period, start, end, startFormatted, endFormatted, level, progress }
  // or { between: true } or { outsideSchedule: true }
  function getCurrentPeriod(config, schoolQuery, nowDate) {
    const level = findLevel(config, schoolQuery);
    if (!level) return { error: `I couldn't find a school matching "${schoolQuery}".` };

    const now = nowDate || new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    const periods = Object.entries(level.schedule);
    for (const [periodKey, [start, end]] of periods) {
      const startMins = toMinutes(start);
      const endMins = toMinutes(end);
      if (nowMins >= startMins && nowMins < endMins) {
        const progress = (nowMins - startMins) / (endMins - startMins);
        return {
          period: periodKey,
          start,
          end,
          startFormatted: formatTime(start),
          endFormatted: formatTime(end),
          level,
          progress: Math.round(progress * 100)
        };
      }
    }

    // Check if between periods or outside schedule
    const allStarts = periods.map(([, [s]]) => toMinutes(s));
    const allEnds = periods.map(([, [, e]]) => toMinutes(e));
    const firstStart = Math.min(...allStarts);
    const lastEnd = Math.max(...allEnds);

    if (nowMins < firstStart || nowMins >= lastEnd) {
      return { outsideSchedule: true, level };
    }

    // Find next period
    for (const [periodKey, [start]] of periods) {
      if (toMinutes(start) > nowMins) {
        return {
          between: true,
          nextPeriod: periodKey,
          nextStart: start,
          nextStartFormatted: formatTime(start),
          level
        };
      }
    }

    return { outsideSchedule: true, level };
  }

  // Query type 3: What period is TIME at school Y?
  // Same as getCurrentPeriod but with a specific time
  function getPeriodAtTime(config, schoolQuery, timeStr) {
    // Parse time like "2:00", "2:00 PM", "14:00"
    let hours, minutes;
    const pmMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
    const milMatch = timeStr.match(/(\d{1,2}):(\d{2})/);

    if (pmMatch) {
      hours = parseInt(pmMatch[1]);
      minutes = parseInt(pmMatch[2] || '0');
      if (pmMatch[3].toLowerCase() === 'pm' && hours !== 12) hours += 12;
      if (pmMatch[3].toLowerCase() === 'am' && hours === 12) hours = 0;
    } else if (milMatch) {
      hours = parseInt(milMatch[1]);
      minutes = parseInt(milMatch[2]);
      // Assume PM for school hours if hour <= 6
      if (hours >= 1 && hours <= 6) hours += 12;
    } else {
      // Try bare number like "2"
      const bare = parseInt(timeStr);
      if (!isNaN(bare)) {
        hours = bare >= 1 && bare <= 6 ? bare + 12 : bare;
        minutes = 0;
      } else {
        return { error: `I couldn't understand the time "${timeStr}".` };
      }
    }

    const fakeDate = new Date();
    fakeDate.setHours(hours, minutes, 0, 0);
    return getCurrentPeriod(config, schoolQuery, fakeDate);
  }

  return { getPeriodTime, getCurrentPeriod, getPeriodAtTime, findLevel, formatTime };
})();
```

**Step 2: Test in browser console**

Add `<script src="js/schedule-engine.js"></script>` to index.html before the closing `</body>` tag, open in browser, and test:

```javascript
// Load config and test all three query types
Config.get().then(config => {
  // Type 1: What time is period 6 at middle school?
  console.log(ScheduleEngine.getPeriodTime(config, 'middle school', 6));
  // Expected: { period: "Period 6", startFormatted: "12:19 PM", endFormatted: "1:00 PM", ... }

  // Type 2: What period is it now at high school?
  console.log(ScheduleEngine.getCurrentPeriod(config, 'GCHS'));
  // Expected: current period or outsideSchedule/between

  // Type 3: What period is 2:00 at the middle school?
  console.log(ScheduleEngine.getPeriodAtTime(config, 'the middle school', '2:00'));
  // Expected: { period: "Period 8", ... } (1:49-2:30)

  // Alias test
  console.log(ScheduleEngine.getPeriodTime(config, 'Hemlock', 3));
  // Expected: Primary, Period 3, 9:40 AM - 10:20 AM
});
```

**Step 3: Commit**

```bash
git add js/schedule-engine.js index.html
git commit -m "feat: schedule engine with period/time/now lookups and fuzzy school matching"
```

---

## Task 3: Voice Parser

**Files:**
- Create: `js/voice-parser.js`

**Step 1: Create voice-parser.js — extracts structured query from natural language**

Create `js/voice-parser.js`:

```javascript
// Voice Parser — extracts structured queries from natural language text
const VoiceParser = (() => {

  // Parse spoken text into a structured query
  // Returns: { type: 'period-to-time' | 'now-to-period' | 'time-to-period', school, period, time }
  function parse(text, config) {
    const t = text.toLowerCase().trim();

    // Extract school name by matching against all aliases
    let school = null;
    let longestMatch = 0;
    for (const level of config.levels) {
      const candidates = [level.name, level.id, ...level.aliases];
      for (const alias of candidates) {
        if (t.includes(alias.toLowerCase()) && alias.length > longestMatch) {
          school = alias;
          longestMatch = alias.length;
        }
      }
    }

    // Extract period number
    const periodMatch = t.match(/period\s+(\d{1,2})/);
    const period = periodMatch ? parseInt(periodMatch[1]) : null;

    // Extract time — patterns like "2:00", "2:30 pm", "14:00", "two o'clock", bare "at 2"
    let time = null;
    const timePatterns = [
      /(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
      /(\d{1,2}\s*(?:am|pm))/i,
      /at\s+(\d{1,2}(?::\d{2})?)/i,
    ];
    for (const pattern of timePatterns) {
      const match = t.match(pattern);
      if (match) {
        time = match[1].trim();
        break;
      }
    }

    // Word-to-number for spoken times like "two o'clock"
    const wordNums = {
      'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
      'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
      'eleven': '11', 'twelve': '12'
    };
    if (!time) {
      const wordTimeMatch = t.match(/(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*o'?\s*clock/i);
      if (wordTimeMatch) {
        time = wordNums[wordTimeMatch[1].toLowerCase()] + ':00';
      }
    }

    // Determine query type
    const isNow = /right now|currently|current|is it now|now at/.test(t);
    const isWhatTime = /what time|when is|when does|start|begin/.test(t);

    if (isWhatTime && period && school) {
      return { type: 'period-to-time', school, period };
    }

    if (time && school && !period) {
      return { type: 'time-to-period', school, time };
    }

    if ((isNow || (!time && !period)) && school) {
      return { type: 'now-to-period', school };
    }

    if (period && school) {
      // Default: if they mention a period and school, give the time
      return { type: 'period-to-time', school, period };
    }

    // Partial matches — try to be helpful
    if (school && !period && !time) {
      return { type: 'now-to-period', school };
    }

    return { type: 'unknown', raw: text, school, period, time };
  }

  return { parse };
})();
```

**Step 2: Test in browser console**

Add `<script src="js/voice-parser.js"></script>` to index.html, then test:

```javascript
Config.get().then(config => {
  // Test various natural phrasings
  console.log(VoiceParser.parse("What time is period 6 at the middle school?", config));
  // Expected: { type: 'period-to-time', school: 'the middle school', period: 6 }

  console.log(VoiceParser.parse("What period is it right now at the high school?", config));
  // Expected: { type: 'now-to-period', school: 'the high school' }

  console.log(VoiceParser.parse("What period is 2:00 at the middle school?", config));
  // Expected: { type: 'time-to-period', school: 'the middle school', time: '2:00' }

  console.log(VoiceParser.parse("What period is it at Hemlock?", config));
  // Expected: { type: 'now-to-period', school: 'Hemlock' }

  console.log(VoiceParser.parse("When does period 3 start at GCHS?", config));
  // Expected: { type: 'period-to-time', school: 'GCHS', period: 3 }
});
```

**Step 3: Commit**

```bash
git add js/voice-parser.js index.html
git commit -m "feat: voice parser extracts structured queries from natural language"
```

---

## Task 4: Speech Module (Web Speech API)

**Files:**
- Create: `js/speech.js`

**Step 1: Create speech.js — wrapper for speech recognition and synthesis**

Create `js/speech.js`:

```javascript
// Speech module — Web Speech API wrapper for recognition + synthesis
const Speech = (() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;

  let recognition = null;
  let isListening = false;

  function isSupported() {
    return !!SpeechRecognition;
  }

  function isSynthSupported() {
    return !!synth;
  }

  // Start listening for speech
  // Returns a Promise that resolves with the transcript text
  function listen() {
    return new Promise((resolve, reject) => {
      if (!isSupported()) {
        reject(new Error('Speech recognition not supported in this browser.'));
        return;
      }

      if (isListening) {
        reject(new Error('Already listening.'));
        return;
      }

      recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      isListening = true;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        isListening = false;
        resolve(transcript);
      };

      recognition.onerror = (event) => {
        isListening = false;
        if (event.error === 'no-speech') {
          reject(new Error('No speech detected. Please try again.'));
        } else if (event.error === 'not-allowed') {
          reject(new Error('Microphone access denied. Please allow microphone access.'));
        } else {
          reject(new Error(`Speech error: ${event.error}`));
        }
      };

      recognition.onend = () => {
        isListening = false;
      };

      recognition.start();
    });
  }

  // Stop listening
  function stop() {
    if (recognition && isListening) {
      recognition.stop();
      isListening = false;
    }
  }

  // Speak text aloud
  function speak(text) {
    return new Promise((resolve) => {
      if (!isSynthSupported()) {
        resolve();
        return;
      }
      // Cancel any current speech
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.05;
      utterance.onend = resolve;
      utterance.onerror = resolve; // Don't block on speech errors
      synth.speak(utterance);
    });
  }

  function getListening() {
    return isListening;
  }

  return { listen, stop, speak, isSupported, isSynthSupported, getListening };
})();
```

**Step 2: Test in browser**

Add `<script src="js/speech.js"></script>` to index.html. Open in browser (must be HTTPS or localhost), open console:

```javascript
// Test speech recognition
Speech.listen().then(text => console.log('Heard:', text)).catch(e => console.error(e));
// Speak into mic — should log transcript

// Test speech synthesis
Speech.speak("Period 6 at the middle school is from 12:19 to 1 PM");
// Should hear spoken output
```

**Step 3: Commit**

```bash
git add js/speech.js index.html
git commit -m "feat: speech module wrapping Web Speech API for recognition and synthesis"
```

---

## Task 5: Main UI — Header, Mic Button, Card Area

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`

**Step 1: Build the full index.html layout**

Replace `index.html` content with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="theme-color" content="#f8f9fa">
  <title>Schedule Assistant</title>
  <link rel="manifest" href="manifest.json">
  <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div id="app">

    <!-- Header -->
    <header id="header">
      <div class="header-left">
        <img id="district-logo" class="district-logo hidden" alt="District logo">
        <h1 id="district-name" class="district-name">Schedule Assistant</h1>
      </div>
      <button id="settings-btn" class="icon-btn" aria-label="Settings">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
        </svg>
      </button>
    </header>

    <!-- Mic Area -->
    <main id="main">
      <button id="mic-btn" class="mic-btn" aria-label="Tap to speak">
        <div class="mic-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        </div>
        <div class="mic-pulse"></div>
        <div class="mic-waveform hidden">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
      </button>
      <p id="mic-status" class="mic-status">Tap to ask a question</p>
      <button id="type-toggle" class="type-toggle">or type instead</button>
      <div id="type-input-area" class="type-input-area hidden">
        <input type="text" id="type-input" class="type-input" placeholder="e.g. What period is it at the high school?" autocomplete="off">
        <button id="type-submit" class="type-submit">Ask</button>
      </div>
    </main>

    <!-- Answer Cards -->
    <section id="cards" class="cards-area"></section>

  </div>

  <script src="js/config.js"></script>
  <script src="js/schedule-engine.js"></script>
  <script src="js/voice-parser.js"></script>
  <script src="js/speech.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

**Step 2: Write the full CSS**

Replace `css/style.css` with the full stylesheet. Key sections:

```css
/* Schedule Assistant — Full Styles */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg: #f8f9fa;
  --bg-card: #ffffff;
  --text: #1a1a2e;
  --text-secondary: #6c757d;
  --shadow: rgba(0, 0, 0, 0.08);
  --mic-bg: #007AFF;
  --mic-active: #FF3B30;
}

body {
  font-family: 'Lexend', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  justify-content: center;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}

body.dark-mode {
  --bg: #1a1a2e;
  --bg-card: #16213e;
  --text: #e8e8e8;
  --text-secondary: #a0a0b0;
  --shadow: rgba(0, 0, 0, 0.3);
}

#app {
  width: 100%;
  max-width: 480px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  min-height: 100dvh;
}

/* Header */
header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.district-logo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: contain;
}

.district-name {
  font-size: 18px;
  font-weight: 600;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background 0.2s;
}

.icon-btn:hover {
  background: rgba(0,0,0,0.05);
}

.hidden {
  display: none !important;
}

/* Mic Button */
main {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  gap: 16px;
}

.mic-btn {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: var(--mic-bg);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.mic-btn:active {
  transform: scale(0.95);
}

.mic-btn.listening {
  background: var(--mic-active);
}

/* Pulse animation */
.mic-pulse {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid var(--mic-bg);
  animation: pulse 2s ease-out infinite;
}

.mic-btn.listening .mic-pulse {
  border-color: var(--mic-active);
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.6); opacity: 0; }
}

/* Waveform animation */
.mic-waveform {
  position: absolute;
  bottom: -30px;
  display: flex;
  gap: 4px;
  align-items: center;
  height: 20px;
}

.mic-waveform span {
  width: 4px;
  height: 8px;
  background: var(--mic-active);
  border-radius: 2px;
  animation: wave 0.6s ease-in-out infinite alternate;
}

.mic-waveform span:nth-child(2) { animation-delay: 0.1s; }
.mic-waveform span:nth-child(3) { animation-delay: 0.2s; }
.mic-waveform span:nth-child(4) { animation-delay: 0.3s; }
.mic-waveform span:nth-child(5) { animation-delay: 0.4s; }

@keyframes wave {
  from { height: 4px; }
  to { height: 20px; }
}

.mic-status {
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
}

/* Type fallback */
.type-toggle {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
  font-family: 'Lexend', sans-serif;
}

.type-input-area {
  width: 100%;
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.type-input {
  flex: 1;
  padding: 12px 16px;
  font-size: 15px;
  font-family: 'Lexend', sans-serif;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: var(--bg-card);
  color: var(--text);
  outline: none;
  transition: border-color 0.2s;
}

.type-input:focus {
  border-color: var(--mic-bg);
}

.type-submit {
  padding: 12px 20px;
  font-size: 15px;
  font-family: 'Lexend', sans-serif;
  background: var(--mic-bg);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 500;
}

/* Answer Cards */
.cards-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 40px;
}

.answer-card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 2px 12px var(--shadow);
  border-left: 5px solid #ccc;
  animation: slideUp 0.3s ease-out;
  transition: opacity 0.3s;
}

.answer-card.faded {
  opacity: 0.4;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.card-period {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
}

.card-school {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 2px;
  font-weight: 400;
}

.card-time {
  font-size: 22px;
  font-weight: 500;
  margin-top: 8px;
}

.card-context {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* Progress bar for "now" queries */
.card-progress {
  width: 100%;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  margin-top: 12px;
  overflow: hidden;
}

body.dark-mode .card-progress {
  background: #2a2a4a;
}

.card-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.card-error {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 2px 12px var(--shadow);
  border-left: 5px solid #FF3B30;
  animation: slideUp 0.3s ease-out;
  font-size: 16px;
  color: var(--text-secondary);
}

/* Query echo */
.card-query {
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
  margin-bottom: 8px;
  opacity: 0.7;
}
```

**Step 3: Verify layout by opening in browser**

Open `index.html` — should see header, mic button with pulse animation, "Tap to ask" text, and "or type instead" link. No functionality yet (app.js doesn't exist).

**Step 4: Commit**

```bash
git add index.html css/style.css
git commit -m "feat: main UI layout with header, mic button, and card area styling"
```

---

## Task 6: Main App Logic (app.js)

**Files:**
- Create: `js/app.js`

**Step 1: Create app.js — ties everything together**

Create `js/app.js`:

```javascript
// Main app — orchestrates voice, parsing, engine, and card rendering
(async () => {
  const config = await Config.get();

  // --- Header setup ---
  const districtNameEl = document.getElementById('district-name');
  const districtLogoEl = document.getElementById('district-logo');
  districtNameEl.textContent = config.districtName || 'Schedule Assistant';
  if (config.districtLogo) {
    districtLogoEl.src = config.districtLogo;
    districtLogoEl.classList.remove('hidden');
  }
  if (config.darkMode) {
    document.body.classList.add('dark-mode');
  }

  // --- Mic button ---
  const micBtn = document.getElementById('mic-btn');
  const micStatus = document.getElementById('mic-status');
  const waveform = micBtn.querySelector('.mic-waveform');
  const cardsArea = document.getElementById('cards');

  micBtn.addEventListener('click', async () => {
    if (!Speech.isSupported()) {
      micStatus.textContent = 'Voice not supported — try typing instead';
      return;
    }

    micBtn.classList.add('listening');
    waveform.classList.remove('hidden');
    micStatus.textContent = 'Listening...';

    try {
      const transcript = await Speech.listen();
      micBtn.classList.remove('listening');
      waveform.classList.add('hidden');
      micStatus.textContent = 'Tap to ask a question';
      handleQuery(transcript);
    } catch (err) {
      micBtn.classList.remove('listening');
      waveform.classList.add('hidden');
      micStatus.textContent = err.message || 'Please try again';
      setTimeout(() => {
        micStatus.textContent = 'Tap to ask a question';
      }, 3000);
    }
  });

  // --- Type fallback ---
  const typeToggle = document.getElementById('type-toggle');
  const typeInputArea = document.getElementById('type-input-area');
  const typeInput = document.getElementById('type-input');
  const typeSubmit = document.getElementById('type-submit');

  typeToggle.addEventListener('click', () => {
    typeInputArea.classList.toggle('hidden');
    if (!typeInputArea.classList.contains('hidden')) {
      typeInput.focus();
    }
  });

  typeSubmit.addEventListener('click', () => {
    const text = typeInput.value.trim();
    if (text) {
      handleQuery(text);
      typeInput.value = '';
    }
  });

  typeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      typeSubmit.click();
    }
  });

  // --- Settings button ---
  document.getElementById('settings-btn').addEventListener('click', () => {
    window.location.href = 'settings.html';
  });

  // --- Query handler ---
  function handleQuery(text) {
    const parsed = VoiceParser.parse(text, config);
    let result;

    switch (parsed.type) {
      case 'period-to-time':
        result = ScheduleEngine.getPeriodTime(config, parsed.school, parsed.period);
        break;
      case 'now-to-period':
        result = ScheduleEngine.getCurrentPeriod(config, parsed.school);
        break;
      case 'time-to-period':
        result = ScheduleEngine.getPeriodAtTime(config, parsed.school, parsed.time);
        break;
      default:
        result = { error: "I didn't understand that. Try asking something like \"What period is it at the high school?\"" };
    }

    renderCard(text, parsed, result);

    // Speak response if enabled
    if (config.voiceResponseEnabled) {
      const spokenText = buildSpokenResponse(parsed, result);
      if (spokenText) Speech.speak(spokenText);
    }
  }

  // --- Card rendering ---
  function renderCard(query, parsed, result) {
    // Fade previous cards
    cardsArea.querySelectorAll('.answer-card').forEach(c => c.classList.add('faded'));

    const card = document.createElement('div');

    if (result.error) {
      card.className = 'card-error';
      card.innerHTML = `
        <div class="card-query">"${escapeHtml(query)}"</div>
        ${escapeHtml(result.error)}
      `;
    } else if (result.outsideSchedule) {
      card.className = 'answer-card';
      card.style.borderLeftColor = result.level.accentColor;
      card.innerHTML = `
        <div class="card-query">"${escapeHtml(query)}"</div>
        <div class="card-period">No Active Period</div>
        <div class="card-school">${escapeHtml(result.level.name)}</div>
        <div class="card-context">School is not in session right now</div>
      `;
    } else if (result.between) {
      card.className = 'answer-card';
      card.style.borderLeftColor = result.level.accentColor;
      card.innerHTML = `
        <div class="card-query">"${escapeHtml(query)}"</div>
        <div class="card-period">Between Periods</div>
        <div class="card-school">${escapeHtml(result.level.name)}</div>
        <div class="card-context">Next up: ${escapeHtml(result.nextPeriod)} at ${escapeHtml(result.nextStartFormatted)}</div>
      `;
    } else {
      card.className = 'answer-card';
      card.style.borderLeftColor = result.level.accentColor;
      let progressHTML = '';
      if (result.progress !== undefined) {
        progressHTML = `
          <div class="card-progress">
            <div class="card-progress-fill" style="width: ${result.progress}%; background: ${result.level.accentColor}"></div>
          </div>
          <div class="card-context">${result.progress}% through this period</div>
        `;
      }
      card.innerHTML = `
        <div class="card-query">"${escapeHtml(query)}"</div>
        <div class="card-period">${escapeHtml(result.period)}</div>
        <div class="card-school">${escapeHtml(result.level.name)}</div>
        <div class="card-time">${escapeHtml(result.startFormatted)} – ${escapeHtml(result.endFormatted)}</div>
        ${progressHTML}
      `;
    }

    cardsArea.prepend(card);
  }

  // --- Spoken response builder ---
  function buildSpokenResponse(parsed, result) {
    if (result.error) return result.error;
    if (result.outsideSchedule) return `${result.level.name} is not in session right now.`;
    if (result.between) return `It's between periods at ${result.level.name}. ${result.nextPeriod} starts at ${result.nextStartFormatted}.`;

    if (parsed.type === 'period-to-time') {
      return `${result.period} at ${result.level.name} is from ${result.startFormatted} to ${result.endFormatted}.`;
    }
    if (parsed.type === 'now-to-period') {
      return `It's currently ${result.period} at ${result.level.name}, from ${result.startFormatted} to ${result.endFormatted}. ${result.progress}% through.`;
    }
    if (parsed.type === 'time-to-period') {
      return `At that time it's ${result.period} at ${result.level.name}, from ${result.startFormatted} to ${result.endFormatted}.`;
    }
    return null;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Siri Shortcut: handle ?q= URL parameter ---
  const urlParams = new URLSearchParams(window.location.search);
  const queryParam = urlParams.get('q');
  if (queryParam) {
    handleQuery(queryParam);
  }

})();
```

**Step 2: Test full flow in browser**

Open `index.html`. Test:
1. Click mic button → speak "What time is period 6 at the middle school?" → card should appear
2. Click "or type instead" → type "What period is it at GCHS" → card should appear
3. Open with URL param: `index.html?q=what+period+is+2+at+hemlock` → card should auto-appear

**Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: main app logic connecting voice, parser, engine, and card rendering"
```

---

## Task 7: Settings Page

**Files:**
- Create: `settings.html`

**Step 1: Create full settings.html with admin UI**

Create `settings.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Settings — Schedule Assistant</title>
  <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
  <link rel="stylesheet" href="css/settings.css">
</head>
<body>
  <div id="app">
    <header>
      <div class="header-left">
        <button id="back-btn" class="icon-btn" aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 class="district-name">Settings</h1>
      </div>
    </header>

    <main class="settings-main">

      <!-- District Branding -->
      <section class="settings-section">
        <h2>District Branding</h2>
        <label class="setting-field">
          <span>District Name</span>
          <input type="text" id="district-name-input" placeholder="e.g. Garden City">
        </label>
        <label class="setting-field">
          <span>Logo</span>
          <input type="file" id="logo-upload" accept="image/*">
        </label>
        <div id="logo-preview-area"></div>
      </section>

      <!-- School Levels -->
      <section class="settings-section">
        <h2>School Levels</h2>
        <div id="levels-list"></div>
        <button id="add-level-btn" class="btn-secondary">+ Add Level</button>
      </section>

      <!-- Preferences -->
      <section class="settings-section">
        <h2>Preferences</h2>
        <label class="setting-toggle">
          <span>Voice Responses</span>
          <input type="checkbox" id="voice-toggle">
          <span class="toggle-slider"></span>
        </label>
        <label class="setting-toggle">
          <span>Dark Mode</span>
          <input type="checkbox" id="dark-mode-toggle">
          <span class="toggle-slider"></span>
        </label>
      </section>

      <!-- Data Management -->
      <section class="settings-section">
        <h2>Data</h2>
        <div class="btn-group">
          <button id="export-btn" class="btn-secondary">Export Config</button>
          <label class="btn-secondary btn-file">
            Import Config
            <input type="file" id="import-input" accept=".json" hidden>
          </label>
          <button id="reset-btn" class="btn-danger">Reset to Default</button>
        </div>
      </section>

    </main>
  </div>

  <script src="js/config.js"></script>
  <script src="js/settings-ui.js"></script>
</body>
</html>
```

**Step 2: Create settings CSS**

Create `css/settings.css`:

```css
/* Settings page styles */
.settings-main {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 40px;
}

.settings-section {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px var(--shadow);
}

.settings-section h2 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text);
}

.setting-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.setting-field span {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.setting-field input[type="text"],
.setting-field input[type="time"] {
  padding: 10px 14px;
  font-size: 15px;
  font-family: 'Lexend', sans-serif;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  background: var(--bg);
  color: var(--text);
  outline: none;
}

.setting-field input:focus {
  border-color: #007AFF;
}

/* Toggle switch */
.setting-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
}

.setting-toggle span:first-child {
  font-size: 15px;
}

.setting-toggle input {
  display: none;
}

.toggle-slider {
  width: 50px;
  height: 28px;
  background: #ccc;
  border-radius: 14px;
  position: relative;
  transition: background 0.3s;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  background: white;
  border-radius: 50%;
  top: 3px;
  left: 3px;
  transition: transform 0.3s;
}

.setting-toggle input:checked + .toggle-slider {
  background: #007AFF;
}

.setting-toggle input:checked + .toggle-slider::after {
  transform: translateX(22px);
}

/* Buttons */
.btn-secondary {
  padding: 10px 18px;
  font-size: 14px;
  font-family: 'Lexend', sans-serif;
  background: var(--bg);
  color: var(--text);
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 500;
}

.btn-danger {
  padding: 10px 18px;
  font-size: 14px;
  font-family: 'Lexend', sans-serif;
  background: #FF3B30;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 500;
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn-file {
  display: inline-block;
  text-align: center;
}

/* Level editor */
.level-card {
  background: var(--bg);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  border-left: 4px solid #ccc;
}

.level-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  margin-bottom: 8px;
}

.level-header h3 {
  font-size: 16px;
  font-weight: 500;
}

.level-body {
  display: none;
}

.level-body.expanded {
  display: block;
}

.level-delete {
  background: none;
  border: none;
  color: #FF3B30;
  font-size: 13px;
  cursor: pointer;
  font-family: 'Lexend', sans-serif;
}

/* Alias tags */
.alias-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0;
}

.alias-tag {
  background: var(--bg-card);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.alias-tag button {
  background: none;
  border: none;
  color: #FF3B30;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.alias-add {
  display: flex;
  gap: 6px;
}

.alias-add input {
  flex: 1;
  padding: 6px 10px;
  font-size: 13px;
  font-family: 'Lexend', sans-serif;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: var(--bg-card);
  color: var(--text);
}

.alias-add button {
  padding: 6px 12px;
  font-size: 13px;
  background: #007AFF;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* Schedule table */
.schedule-table {
  width: 100%;
  margin-top: 12px;
  font-size: 13px;
}

.schedule-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  align-items: center;
}

.schedule-row input {
  padding: 6px 8px;
  font-size: 13px;
  font-family: 'Lexend', sans-serif;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: var(--bg-card);
  color: var(--text);
}

.schedule-row input[type="time"] {
  width: 110px;
}

.schedule-row .period-name {
  flex: 1;
  min-width: 80px;
}

#logo-preview-area img {
  max-width: 80px;
  max-height: 80px;
  border-radius: 8px;
  margin-top: 8px;
}
```

**Step 3: Create settings-ui.js**

Create `js/settings-ui.js`:

```javascript
// Settings UI — renders and manages the admin screen
(async () => {
  let config = await Config.get();

  // --- Back button ---
  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  // --- Dark mode (apply immediately) ---
  if (config.darkMode) document.body.classList.add('dark-mode');

  // --- District branding ---
  const nameInput = document.getElementById('district-name-input');
  nameInput.value = config.districtName || '';
  nameInput.addEventListener('input', () => {
    config.districtName = nameInput.value;
    Config.save(config);
  });

  const logoUpload = document.getElementById('logo-upload');
  const logoPreview = document.getElementById('logo-preview-area');

  if (config.districtLogo) {
    logoPreview.innerHTML = `<img src="${config.districtLogo}" alt="Logo">`;
  }

  logoUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      config.districtLogo = ev.target.result;
      Config.save(config);
      logoPreview.innerHTML = `<img src="${ev.target.result}" alt="Logo">`;
    };
    reader.readAsDataURL(file);
  });

  // --- Preferences ---
  const voiceToggle = document.getElementById('voice-toggle');
  voiceToggle.checked = config.voiceResponseEnabled !== false;
  voiceToggle.addEventListener('change', () => {
    config.voiceResponseEnabled = voiceToggle.checked;
    Config.save(config);
  });

  const darkToggle = document.getElementById('dark-mode-toggle');
  darkToggle.checked = !!config.darkMode;
  darkToggle.addEventListener('change', () => {
    config.darkMode = darkToggle.checked;
    document.body.classList.toggle('dark-mode', config.darkMode);
    Config.save(config);
  });

  // --- Data management ---
  document.getElementById('export-btn').addEventListener('click', () => {
    Config.exportJSON(config);
  });

  document.getElementById('import-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      config = await Config.importJSON(file);
      renderLevels();
      nameInput.value = config.districtName || '';
      alert('Config imported successfully!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });

  document.getElementById('reset-btn').addEventListener('click', async () => {
    if (confirm('Reset all settings to default Garden City config?')) {
      config = await Config.reset();
      renderLevels();
      nameInput.value = config.districtName || '';
      voiceToggle.checked = true;
      darkToggle.checked = false;
      document.body.classList.remove('dark-mode');
      logoPreview.innerHTML = '';
    }
  });

  // --- Level editor ---
  const levelsList = document.getElementById('levels-list');

  function renderLevels() {
    levelsList.innerHTML = '';
    config.levels.forEach((level, idx) => {
      const card = document.createElement('div');
      card.className = 'level-card';
      card.style.borderLeftColor = level.accentColor || '#ccc';

      const periods = Object.entries(level.schedule);
      const scheduleRows = periods.map(([name, [start, end]], pIdx) => `
        <div class="schedule-row">
          <input class="period-name" type="text" value="${name}" data-level="${idx}" data-period="${pIdx}" data-field="name">
          <input type="time" value="${start}" data-level="${idx}" data-period="${pIdx}" data-field="start">
          <input type="time" value="${end}" data-level="${idx}" data-period="${pIdx}" data-field="end">
        </div>
      `).join('');

      const aliasTags = level.aliases.map((a, aIdx) => `
        <span class="alias-tag">${a} <button data-level="${idx}" data-alias="${aIdx}">&times;</button></span>
      `).join('');

      card.innerHTML = `
        <div class="level-header" data-idx="${idx}">
          <h3>${level.name}</h3>
          <button class="level-delete" data-idx="${idx}">Delete</button>
        </div>
        <div class="level-body" id="level-body-${idx}">
          <label class="setting-field">
            <span>Level Name</span>
            <input type="text" value="${level.name}" data-level="${idx}" data-field="level-name">
          </label>
          <label class="setting-field">
            <span>Accent Color</span>
            <input type="color" value="${level.accentColor || '#007AFF'}" data-level="${idx}" data-field="accent-color" style="height:40px;padding:2px;">
          </label>
          <div>
            <span style="font-size:13px;color:var(--text-secondary);">Aliases</span>
            <div class="alias-tags" id="aliases-${idx}">${aliasTags}</div>
            <div class="alias-add">
              <input type="text" placeholder="Add alias..." id="alias-input-${idx}">
              <button data-level="${idx}" class="alias-add-btn">Add</button>
            </div>
          </div>
          <div style="margin-top:12px;">
            <span style="font-size:13px;color:var(--text-secondary);">Schedule</span>
            <div class="schedule-table">${scheduleRows}</div>
          </div>
        </div>
      `;

      levelsList.appendChild(card);
    });

    attachLevelEvents();
  }

  function attachLevelEvents() {
    // Toggle expand
    document.querySelectorAll('.level-header').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('level-delete')) return;
        const idx = el.dataset.idx;
        document.getElementById(`level-body-${idx}`).classList.toggle('expanded');
      });
    });

    // Delete level
    document.querySelectorAll('.level-delete').forEach(el => {
      el.addEventListener('click', () => {
        if (confirm(`Delete ${config.levels[el.dataset.idx].name}?`)) {
          config.levels.splice(parseInt(el.dataset.idx), 1);
          Config.save(config);
          renderLevels();
        }
      });
    });

    // Level name change
    document.querySelectorAll('[data-field="level-name"]').forEach(el => {
      el.addEventListener('input', () => {
        config.levels[el.dataset.level].name = el.value;
        Config.save(config);
      });
    });

    // Accent color change
    document.querySelectorAll('[data-field="accent-color"]').forEach(el => {
      el.addEventListener('input', () => {
        config.levels[el.dataset.level].accentColor = el.value;
        Config.save(config);
      });
    });

    // Remove alias
    document.querySelectorAll('.alias-tag button').forEach(el => {
      el.addEventListener('click', () => {
        config.levels[el.dataset.level].aliases.splice(parseInt(el.dataset.alias), 1);
        Config.save(config);
        renderLevels();
      });
    });

    // Add alias
    document.querySelectorAll('.alias-add-btn').forEach(el => {
      el.addEventListener('click', () => {
        const input = document.getElementById(`alias-input-${el.dataset.level}`);
        const val = input.value.trim();
        if (val) {
          config.levels[el.dataset.level].aliases.push(val);
          Config.save(config);
          renderLevels();
        }
      });
    });

    // Schedule changes
    document.querySelectorAll('.schedule-row input').forEach(el => {
      el.addEventListener('change', () => {
        const lvl = parseInt(el.dataset.level);
        const pIdx = parseInt(el.dataset.period);
        const field = el.dataset.field;
        const periods = Object.entries(config.levels[lvl].schedule);
        const [oldName, times] = periods[pIdx];

        if (field === 'name' && el.value !== oldName) {
          const newSchedule = {};
          periods.forEach(([n, t], i) => {
            newSchedule[i === pIdx ? el.value : n] = t;
          });
          config.levels[lvl].schedule = newSchedule;
        } else if (field === 'start') {
          times[0] = el.value;
        } else if (field === 'end') {
          times[1] = el.value;
        }

        Config.save(config);
      });
    });
  }

  // Add level
  document.getElementById('add-level-btn').addEventListener('click', () => {
    config.levels.push({
      id: 'new-' + Date.now(),
      name: 'New Level',
      accentColor: '#007AFF',
      aliases: [],
      schedule: {
        'Period 1': ['08:00', '08:45'],
        'Period 2': ['08:50', '09:35'],
      }
    });
    Config.save(config);
    renderLevels();
  });

  renderLevels();
})();
```

**Step 4: Verify settings page**

Open `settings.html` — should see branding fields, expandable level cards, toggles, export/import/reset buttons. Change district name → go back to index.html → should show new name.

**Step 5: Commit**

```bash
git add settings.html css/settings.css js/settings-ui.js
git commit -m "feat: settings page with district branding, level editor, and config management"
```

---

## Task 8: PWA Setup (Manifest + Service Worker)

**Files:**
- Create: `manifest.json`
- Create: `sw.js`

**Step 1: Create manifest.json**

```json
{
  "name": "Schedule Assistant",
  "short_name": "Schedule",
  "description": "Voice-powered school schedule assistant",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f8f9fa",
  "theme_color": "#007AFF",
  "icons": [
    {
      "src": "assets/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "assets/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Step 2: Create sw.js**

```javascript
const CACHE_NAME = 'schedule-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/settings.html',
  '/css/style.css',
  '/css/settings.css',
  '/js/app.js',
  '/js/config.js',
  '/js/schedule-engine.js',
  '/js/voice-parser.js',
  '/js/speech.js',
  '/js/settings-ui.js',
  '/config-default.json',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
});
```

**Step 3: Register service worker in index.html**

Add before the closing `</body>` tag in `index.html`, before the other scripts:

```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

**Step 4: Create placeholder PWA icons**

We need 192x192 and 512x512 PNG icons. For now, create simple SVG-based placeholders. The user can replace these later.

Create a simple script or note that icons need to be generated. For now, the PWA will work without custom icons.

**Step 5: Commit**

```bash
git add manifest.json sw.js index.html
git commit -m "feat: PWA manifest and service worker for offline support"
```

---

## Task 9: Siri Shortcuts Setup

**Files:**
- Create: `docs/siri-shortcut-setup.md`

**Step 1: Create Siri Shortcut documentation**

Create `docs/siri-shortcut-setup.md` with instructions for creating the Apple Shortcut:

```markdown
# Siri Shortcut Setup

## Quick Setup

1. Open the **Shortcuts** app on your iPhone
2. Tap **+** to create a new shortcut
3. Add these actions in order:

### Action 1: Ask for Input
- Action: **Ask for Input**
- Type: Text
- Prompt: "What would you like to know about the schedule?"

### Action 2: Open URL
- Action: **Open URLs**
- URL: `https://YOUR-VERCEL-URL.vercel.app/?q=[Provided Input]`
  - Replace `[Provided Input]` with the variable from Step 1

4. Tap the shortcut name at the top → **Rename** to "School Schedule"
5. Tap **Add to Home Screen** if desired

## "Hey Siri" Setup

1. Open the shortcut you created
2. Tap the **ⓘ** icon
3. Tap **Add to Siri**
4. Record a phrase like "School Schedule" or "Check the schedule"

Now you can say: **"Hey Siri, School Schedule"** → it asks your question → opens the app with the answer.

## Alternative: Direct Voice Shortcut

For a fully voice-in/voice-out experience without opening the browser:

1. Create a new shortcut
2. **Dictate Text** action (captures your voice)
3. **Get Contents of URL**: `https://YOUR-VERCEL-URL.vercel.app/api/query?q=[Dictated Text]`
   (This requires a simple API endpoint — see Task 10)
4. **Speak Text** action with the result

Note: The API endpoint approach requires a serverless function on Vercel (future enhancement).
```

**Step 2: Commit**

```bash
mkdir -p docs
git add docs/siri-shortcut-setup.md
git commit -m "docs: Siri Shortcut setup instructions"
```

---

## Task 10: Vercel Deployment Setup

**Files:**
- Create: `vercel.json`
- Create: `.gitignore`

**Step 1: Create vercel.json**

```json
{
  "cleanUrls": true,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    }
  ]
}
```

**Step 2: Create .gitignore**

```
.DS_Store
node_modules/
.vercel
```

**Step 3: Initialize GitHub repo and push**

```bash
git add vercel.json .gitignore
git commit -m "feat: Vercel deployment config"
```

Then:

```bash
# Create GitHub repo (if gh CLI available)
gh repo create schedule-assistant --public --source=. --push

# Or manually:
# git remote add origin https://github.com/YOUR_USERNAME/schedule-assistant.git
# git push -u origin main
```

**Step 4: Connect to Vercel**

1. Go to vercel.com → New Project
2. Import the GitHub repo
3. Framework Preset: Other
4. Deploy

The app is now live. Update the Siri Shortcut docs with the actual Vercel URL.

**Step 5: Commit any URL updates**

```bash
git add -A
git commit -m "docs: update with live Vercel URL"
git push
```

---

## Task 11: Final Polish & Testing

**Files:**
- Modify: `css/style.css` (minor tweaks)
- Modify: `index.html` (meta tags)

**Step 1: Add Apple-specific meta tags to index.html**

Add to `<head>`:

```html
<link rel="apple-touch-icon" href="assets/icon-192.png">
<meta name="apple-mobile-web-app-title" content="Schedule">
```

**Step 2: Test all three voice queries on a phone**

Open the Vercel URL on your iPhone:
1. "What time is period 6 at the middle school?" → Card: Period 6, 12:19 PM – 1:00 PM, blue border
2. "What period is it right now at the high school?" → Card: current period or outside schedule
3. "What period is 2:00 at the middle school?" → Card: Period 8, 1:49 PM – 2:30 PM
4. "What period is it at Hemlock?" → Card: resolves to Primary
5. Test "Add to Home Screen" from Safari share menu
6. Test dark mode toggle in settings
7. Test export/import config

**Step 3: Test Siri Shortcut**

Follow docs/siri-shortcut-setup.md to create shortcut. Test "Hey Siri, School Schedule."

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: final polish with Apple meta tags and PWA icons"
git push
```

---

## Summary of Tasks

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project scaffolding & config | config-default.json, js/config.js, index.html |
| 2 | Schedule engine (3 lookup types) | js/schedule-engine.js |
| 3 | Voice parser (NLP) | js/voice-parser.js |
| 4 | Speech module (Web Speech API) | js/speech.js |
| 5 | Main UI (header, mic, cards) | index.html, css/style.css |
| 6 | Main app logic | js/app.js |
| 7 | Settings page | settings.html, css/settings.css, js/settings-ui.js |
| 8 | PWA setup | manifest.json, sw.js |
| 9 | Siri Shortcuts docs | docs/siri-shortcut-setup.md |
| 10 | Vercel deployment | vercel.json, .gitignore, GitHub + Vercel |
| 11 | Final polish & testing | Meta tags, phone testing, Siri test |
