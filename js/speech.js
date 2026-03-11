const Speech = (() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;

  const SILENCE_AFTER_SPEECH_MS = 1500; // Accept result 1.5s after last speech

  let recognition = null;
  let isListening = false;
  let _stopReject = null;

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
      isListening = true;

      recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let settled = false;
      let finalTranscript = '';
      let silenceTimer = null;

      // Store reject so stop() can trigger it
      _stopReject = reject;

      function settle() {
        settled = true;
        isListening = false;
        _stopReject = null;
        clearTimeout(silenceTimer);
      }

      recognition.onresult = (event) => {
        if (settled) return;

        // Build transcript from all results
        finalTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        // Once we have a final result, wait for silence then resolve
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
        // "no-speech" on iOS fires when silence is detected — keep listening
        // Only stop on real errors
        if (event.error === 'no-speech') {
          // If we already have speech, use it
          if (finalTranscript.trim()) {
            settle();
            recognition = null;
            resolve(finalTranscript.trim());
          }
          // Otherwise keep listening — don't reject
          return;
        }
        settle();
        recognition = null;
        if (event.error === 'not-allowed') reject(new Error('Microphone access denied. Please allow microphone access.'));
        else if (event.error === 'aborted') reject(new Error('Stopped listening.'));
        else reject(new Error(`Speech error: ${event.error}`));
      };

      recognition.onend = () => {
        if (!settled) {
          // Continuous mode ended unexpectedly (iOS sometimes does this)
          // If we have transcript, use it. Otherwise restart.
          if (finalTranscript.trim()) {
            settle();
            recognition = null;
            resolve(finalTranscript.trim());
          } else if (isListening) {
            // Restart listening — iOS Safari stops continuous mode after silence
            try { recognition.start(); } catch (e) {
              settle();
              recognition = null;
              reject(new Error('No speech detected. Tap to try again.'));
            }
          }
        }
      };

      recognition.start();
    });
  }

  function stop() {
    isListening = false;
    clearTimeout();
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.abort(); } catch (e) {}
      try { recognition.stop(); } catch (e) {}
      recognition = null;
    }
    if (synth) { synth.cancel(); }
    if (_stopReject) {
      _stopReject(new Error('Stopped listening.'));
      _stopReject = null;
    }
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
