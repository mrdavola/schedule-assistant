const Speech = (() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;

  const MAX_LISTEN_MS = 8000; // Auto-stop after 8 seconds max

  let recognition = null;
  let isListening = false;
  let timeoutId = null;
  let _reject = null; // Store reject so we can call it from stop()

  function isSupported() { return !!SpeechRecognition; }
  function isSynthSupported() { return !!synth; }

  function listen() {
    return new Promise((resolve, reject) => {
      if (!isSupported()) { reject(new Error('Speech recognition not supported in this browser.')); return; }

      // If already listening, force-stop first
      if (isListening || recognition) {
        forceStop();
      }

      recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      isListening = true;
      _reject = reject;

      // Auto-timeout: forcefully stop after MAX_LISTEN_MS
      timeoutId = setTimeout(() => {
        if (isListening) {
          forceStop();
          reject(new Error('Listening timed out. Tap to try again.'));
        }
      }, MAX_LISTEN_MS);

      recognition.onresult = (event) => {
        clearTimeout(timeoutId);
        const transcript = event.results[0][0].transcript;
        isListening = false;
        _reject = null;
        // Fully destroy recognition to release mic
        try { recognition.stop(); } catch (e) {}
        recognition = null;
        resolve(transcript);
      };

      recognition.onerror = (event) => {
        clearTimeout(timeoutId);
        isListening = false;
        _reject = null;
        try { recognition.abort(); } catch (e) {}
        recognition = null;
        if (event.error === 'no-speech') reject(new Error('No speech detected. Please try again.'));
        else if (event.error === 'not-allowed') reject(new Error('Microphone access denied. Please allow microphone access.'));
        else if (event.error === 'aborted') reject(new Error('Stopped listening.'));
        else reject(new Error(`Speech error: ${event.error}`));
      };

      recognition.onend = () => {
        clearTimeout(timeoutId);
        isListening = false;
        // Ensure recognition is fully destroyed
        recognition = null;
      };

      recognition.start();
    });
  }

  // Aggressively kill the mic — called on visibility change, timeout, etc.
  function forceStop() {
    clearTimeout(timeoutId);
    timeoutId = null;
    isListening = false;

    if (recognition) {
      // Remove all handlers first so they don't fire
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.abort(); } catch (e) {}
      try { recognition.stop(); } catch (e) {}
      recognition = null;
    }

    if (synth) { synth.cancel(); }

    if (_reject) {
      _reject(new Error('Stopped listening.'));
      _reject = null;
    }
  }

  function stop() {
    forceStop();
  }

  // Release mic on ANY page exit scenario
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) forceStop();
  });
  window.addEventListener('pagehide', forceStop);
  window.addEventListener('beforeunload', forceStop);
  window.addEventListener('blur', forceStop);
  // iOS-specific: freeze event fires when page is suspended
  window.addEventListener('freeze', forceStop);

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
