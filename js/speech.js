const Speech = (() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;

  const MAX_LISTEN_MS = 10000; // Auto-stop after 10 seconds

  let recognition = null;
  let isListening = false;
  let timeoutId = null;

  function isSupported() { return !!SpeechRecognition; }
  function isSynthSupported() { return !!synth; }

  function listen() {
    return new Promise((resolve, reject) => {
      if (!isSupported()) { reject(new Error('Speech recognition not supported in this browser.')); return; }

      // If already listening, clean up first
      if (recognition) {
        try { recognition.abort(); } catch (e) {}
        recognition = null;
      }
      clearTimeout(timeoutId);
      isListening = true;

      recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      let settled = false;
      function settle() { settled = true; isListening = false; clearTimeout(timeoutId); }

      // Auto-timeout
      timeoutId = setTimeout(() => {
        if (!settled) {
          settle();
          try { recognition.abort(); } catch (e) {}
          recognition = null;
          reject(new Error('Listening timed out. Tap to try again.'));
        }
      }, MAX_LISTEN_MS);

      recognition.onresult = (event) => {
        if (settled) return;
        settle();
        const transcript = event.results[0][0].transcript;
        try { recognition.stop(); } catch (e) {}
        recognition = null;
        resolve(transcript);
      };

      recognition.onerror = (event) => {
        if (settled) return;
        settle();
        recognition = null;
        if (event.error === 'no-speech') reject(new Error('No speech detected. Please try again.'));
        else if (event.error === 'not-allowed') reject(new Error('Microphone access denied. Please allow microphone access.'));
        else if (event.error === 'aborted') reject(new Error('Stopped listening.'));
        else reject(new Error(`Speech error: ${event.error}`));
      };

      recognition.onend = () => {
        // If onend fires without result or error (e.g. silence), reject
        if (!settled) {
          settle();
          recognition = null;
          reject(new Error('No speech detected. Tap to try again.'));
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
  // NOT on blur — blur fires on iOS when mic permission dialog shows
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
