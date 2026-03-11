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

4. Tap the shortcut name at the top and **Rename** to "School Schedule"
5. Tap **Add to Home Screen** if desired

## "Hey Siri" Setup

1. Open the shortcut you created
2. Tap the **i** icon
3. Tap **Add to Siri**
4. Record a phrase like "School Schedule" or "Check the schedule"

Now you can say: **"Hey Siri, School Schedule"** and it asks your question then opens the app with the answer.

## Alternative: Direct Voice Shortcut

For a fully voice-in/voice-out experience without opening the browser:

1. Create a new shortcut
2. **Dictate Text** action (captures your voice)
3. **Get Contents of URL**: `https://YOUR-VERCEL-URL.vercel.app/api/query?q=[Dictated Text]`
   (This requires a simple API endpoint — future enhancement)
4. **Speak Text** action with the result
