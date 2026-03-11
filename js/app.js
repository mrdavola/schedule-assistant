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
    window.location.href = 'settings';
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

    if (config.voiceResponseEnabled) {
      const spokenText = buildSpokenResponse(parsed, result);
      if (spokenText) Speech.speak(spokenText);
    }
  }

  // --- Card rendering ---
  function renderCard(query, parsed, result) {
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
