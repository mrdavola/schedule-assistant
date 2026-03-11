const Speech = (() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;

  let recognition = null;
  let isListening = false;

  function isSupported() { return !!SpeechRecognition; }
  function isSynthSupported() { return !!synth; }

  function listen() {
    return new Promise((resolve, reject) => {
      if (!isSupported()) { reject(new Error('Speech recognition not supported in this browser.')); return; }
      if (isListening) { reject(new Error('Already listening.')); return; }

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
        if (event.error === 'no-speech') reject(new Error('No speech detected. Please try again.'));
        else if (event.error === 'not-allowed') reject(new Error('Microphone access denied. Please allow microphone access.'));
        else reject(new Error(`Speech error: ${event.error}`));
      };

      recognition.onend = () => { isListening = false; };
      recognition.start();
    });
  }

  function stop() {
    if (recognition && isListening) { recognition.stop(); isListening = false; }
  }

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
