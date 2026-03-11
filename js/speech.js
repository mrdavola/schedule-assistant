const Speech = (() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;

  const MAX_LISTEN_MS = 10000;       // Hard stop after 10 seconds of total listening
  const SILENCE_AFTER_SPEECH_MS = 1500; // Wait 1.5s of silence after last word before accepting

  let recognition = null;
  let isListening = false;
  let timeoutId = null;

  function isSupported() { return !!SpeechRecognition; }
  function isSynthSupported() { return !!synth; }

  function listen() {
    return new Promise((resolve, reject) => {
      if (!isSupported()) { reject(new Error('Speech recognition not supported in this browser.')); return; }

      // Clean up any previous session
      if (recognition) {
        try { recognition.abort(); } catch (e) {}
        recognition = null;
      }
      clearTimeout(timeoutId);
      isListening = true;

      recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let settled = false;
      let finalTranscript = '';
      let silenceTimer = null;
      let hasHeardSpeech = false;

      function settle() {
        settled = true;
        isListening = false;
        clearTimeout(timeoutId);
        clearTimeout(silenceTimer);
      }

      // Hard timeout — no matter what, stop after MAX_LISTEN_MS
      timeoutId = setTimeout(() => {
        if (!settled) {
          settle();
          try { recognition.stop(); } catch (e) {}
          recognition = null;
          if (finalTranscript.trim()) {
            resolve(finalTranscript.trim());
          } else {
            reject(new Error('Listening timed out. Tap to try again.'));
          }
        }
      }, MAX_LISTEN_MS);

      recognition.onresult = (event) => {
        if (settled) return;
        hasHeardSpeech = true;

        // Build transcript from all results
        let interim = '';
        finalTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        // If we have a final result, wait a beat for more speech, then resolve
        if (finalTranscript.trim()) {
          clearTimeout(silenceTimer);
          silenceTimer = setTimeout(() => {
            if (!settled) {
              settle();
              try { recognition.stop(); } catch (e) {}
              recognition = null;
              resolve(finalTranscript.trim());
            }
          }, SILENCE_AFTER_SPEECH_MS);
        }
      };

      recognition.onerror = (event) => {
        if (settled) return;
        // On "no-speech", if we have partial transcript, use it
        if (event.error === 'no-speech' && finalTranscript.trim()) {
          settle();
          recognition = null;
          resolve(finalTranscript.trim());
          return;
        }
        settle();
        recognition = null;
        if (event.error === 'no-speech') reject(new Error('No speech detected. Please try again.'));
        else if (event.error === 'not-allowed') reject(new Error('Microphone access denied. Please allow microphone access.'));
        else if (event.error === 'aborted') reject(new Error('Stopped listening.'));
        else reject(new Error(`Speech error: ${event.error}`));
      };

      recognition.onend = () => {
        // In continuous mode, onend fires when recognition stops
        if (!settled) {
          settle();
          recognition = null;
          if (finalTranscript.trim()) {
            resolve(finalTranscript.trim());
          } else {
            reject(new Error('No speech detected. Tap to try again.'));
          }
        }
      };

      recognition.start();
    });
  }

  function stop() {
    clearTimeout(timeoutId);
    isListening = false;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.abort(); } catch (e) {}
      try { recognition.stop(); } catch (e) {}
      recognition = null;
    }
    if (synth) { synth.cancel(); }
  }

  // Release mic when page is hidden (tab switch, lock screen, app switch)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });
  window.addEventListener('pagehide', stop);

  function speak(text) {
    return new Promise((resolve) => {
      if (!isSynthSupported()) { resolve(); return; }
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.05;
      utterance.onend = resolve;
      utterance.onerror = resolve;
      synth.speak(utterance);
    });
  }

  function getListening() { return isListening; }

  return { listen, stop, speak, isSupported, isSynthSupported, getListening };
})();
