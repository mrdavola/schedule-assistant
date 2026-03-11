# School Schedule Voice Assistant — Design Document

**Date:** 2026-03-11
**Approach:** PWA + Siri Shortcuts
**Stack:** Plain HTML/CSS/JS, PWA, GitHub repo, Vercel hosting
**Status:** Approved

---

## Problem

Users need to quickly answer schedule questions like "What time is period 6 at the middle school?" or "What period is it right now at the high school?" — by voice, from their phone, with zero friction.

## Solution

A voice-first Progressive Web App with Siri Shortcuts integration. Tap the mic, ask in natural language, get a beautiful answer card with optional spoken response. Garden City School District is the default config. Any district can customize it via an admin screen or JSON import.

---

## Data Architecture

```json
{
  "districtName": "Garden City",
  "districtLogo": null,
  "levels": [
    {
      "id": "primary",
      "name": "Primary",
      "accentColor": "#4CAF50",
      "aliases": ["Locust", "Hemlock", "Homestead", "Locust School", "Hemlock School", "Homestead School"],
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
      "aliases": ["Stratford", "Stratford Avenue School", "Stratford School", "Stewart", "Stewart School"],
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

- Stored in `localStorage` on device
- Garden City config is the hardcoded default — works immediately, no setup
- Exportable/importable as JSON file for other districts
- All times in 24-hour format for clean comparison logic
- District logo stored as base64 in localStorage

---

## Voice Query Engine

Three query types, no AI/LLM needed — pattern matching only:

| Query Type | Example | Extracts |
|-----------|---------|----------|
| Period → Time | "What time is period 6 at the middle school?" | school + period → returns time range |
| Now → Period | "What period is it right now at the high school?" | school + system clock → returns current period |
| Time → Period | "What period is 2:00 at the middle school?" | school + time → returns period |

**Processing pipeline:**
1. Web Speech API captures voice → text
2. Parser extracts: school name, period number (if any), time (if any, or "now")
3. Fuzzy-match school name against all aliases (e.g., "Hemlock" → Primary)
4. Run the appropriate lookup via schedule-engine
5. Display answer card + optionally speak response via text-to-speech

---

## UI Design

### Layout — Single screen, three zones:

1. **Top:** District logo (if uploaded) + district name + settings gear icon
2. **Center:** Large mic button with pulse animation (idle) / waveform (listening)
3. **Bottom:** Answer card area — cards slide up on answer

### Answer Card:
- Big bold period number (e.g., "Period 6")
- School level name underneath
- Time range in large text (e.g., "12:19 – 1:00")
- Color-coded left border per school level (accent colors from config)
- For "now" queries: progress bar showing how far through the period
- Previous cards fade to 40% opacity and stack below

### Interaction Flow:
1. Tap mic → listening state (waveform animation)
2. Speak question
3. Card slides up with answer
4. If voice output enabled, answer spoken simultaneously
5. Previous cards stack with reduced opacity

### Manual Fallback:
- "Type instead" link below mic button
- Text input field appears, same processing pipeline

### Visual Design:
- Clean white background, dark text
- School-level accent colors on card borders
- Dark mode supported (toggle in settings)
- Font: Lexend (400, 500, 600 weights)
- Responsive — optimized for phone screens

---

## Settings / Admin Screen

Accessed via gear icon in top corner.

### District Branding
- District name (text input)
- Logo upload (image picker, stored as base64)

### School Levels
- List of levels, each expandable:
  - Level name (editable)
  - Accent color (color picker)
  - Aliases (add/remove as tags)
  - Schedule table (period name, start time, end time — editable)
- Add new level button
- Delete level (with confirmation)

### Preferences
- Voice response toggle (on/off)
- Dark mode toggle

### Data Management
- Export config as JSON (download)
- Import config from JSON (upload)
- Reset to default Garden City config (with confirmation)

All changes save to localStorage instantly — no save button.

---

## Siri Shortcuts Integration

- PWA hosted on Vercel (auto-deploys from GitHub)
- Siri Shortcut accepts voice input, passes query as URL parameter: `https://your-app.vercel.app/?q=what+period+is+it+at+the+high+school`
- Page parses query param, runs lookup, returns plain text answer
- Shortcut speaks the answer via Siri
- Uses the default Garden City config (baked in)
- User downloads shortcut via provided link, optionally renames trigger phrase

---

## Project Structure

```
/schedule
  index.html              — Main app (mic, cards, voice engine)
  settings.html           — Admin/settings screen
  /css
    style.css             — All styles, dark mode, card animations
  /js
    app.js                — Main app logic, mic button, card rendering
    voice-parser.js       — Parses spoken text → structured query
    schedule-engine.js    — Lookups (period→time, time→period, now→period)
    config.js             — Load/save config, import/export, defaults
    speech.js             — Web Speech API wrapper (recognition + synthesis)
  /assets
    default-logo.png      — Garden City logo (optional)
  config-default.json     — Garden City default config
  manifest.json           — PWA manifest (icon, name, theme color)
  sw.js                   — Service worker (offline caching)
  vercel.json             — Vercel config (if needed)
```

- No build tools, no frameworks — plain HTML/CSS/JS
- GitHub repo for source control
- Vercel for hosting (auto-deploy on push)
- PWA with service worker for offline support

---

## Future Enhancements (Not in v1)

- **Calendar integration:** Read iOS calendar events, match event location to school, determine period automatically. "What period is my next meeting?"
- **Native iOS app:** Evolve to React Native/Expo for deeper OS integration
- **Per-building schedules:** If buildings within a level ever diverge
- **Multiple schedule types:** Half days, delayed openings, early dismissals
- **Siri with custom config:** Pass district config to Siri Shortcut (currently uses default only)
