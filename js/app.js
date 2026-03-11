(async () => {
  const config = await Config.get();

  // --- Header setup ---
  const districtNameEl = document.getElementById('district-name');
  const districtLogoEl = document.getElementById('district-logo');
  districtNameEl.textContent = config.districtName || 'Schedule Assistant';
  if (config.districtLogo) {
    districtLogoEl.src = config.districtLogo;
    districtLogoEl.classList.remove('hidden');
    // Use saved theme color if available, otherwise extract from logo
    if (config.themeColor) {
      const r = parseInt(config.themeColor.slice(1, 3), 16);
      const g = parseInt(config.themeColor.slice(3, 5), 16);
      const b = parseInt(config.themeColor.slice(5, 7), 16);
      ColorExtract.applyTheme({ r, g, b, hex: config.themeColor });
    } else {
      ColorExtract.applyFromLogo(config.districtLogo);
    }
  }
  if (config.darkMode) {
    document.body.classList.add('dark-mode');
  }

  // --- Mic button ---
  const micBtn = document.getElementById('mic-btn');
  const micStatus = document.getElementById('mic-status');
  const waveform = document.querySelector('.mic-waveform');
  const cardsArea = document.getElementById('cards');

  let micActive = false;

  function resetMicUI() {
    micActive = false;
    micBtn.classList.remove('listening');
    waveform.classList.add('hidden');
    micStatus.textContent = 'Tap to ask a question';
  }

  micBtn.addEventListener('click', async () => {
    if (!Speech.isSupported()) {
      micStatus.textContent = 'Voice not supported — try typing instead';
      return;
    }

    // If already listening, tap again to stop
    if (micActive) {
      Speech.stop();
      resetMicUI();
      return;
    }

    micActive = true;
    micBtn.classList.add('listening');
    waveform.classList.remove('hidden');
    micStatus.textContent = 'Listening...';

    try {
      const transcript = await Speech.listen();
      resetMicUI();
      handleQuery(transcript);
    } catch (err) {
      resetMicUI();
      if (err.message !== 'Stopped listening.') {
        micStatus.textContent = err.message || 'Please try again';
        setTimeout(() => {
          micStatus.textContent = 'Tap to ask a question';
        }, 3000);
      }
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

  // --- Reset mic UI when page becomes visible again (in case force-stopped) ---
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      micBtn.classList.remove('listening');
      waveform.classList.add('hidden');
      micStatus.textContent = 'Tap to ask a question';
    }
  });

  // --- Settings button ---
  document.getElementById('settings-btn').addEventListener('click', () => {
    window.location.href = 'settings';
  });

  // --- Query handler ---
  function handleQuery(text) {
    const parsed = VoiceParser.parse(text, config);

    // All-schools queries get special rendering
    if (parsed.type === 'now-all-schools') {
      const results = config.levels.map(level =>
        ScheduleEngine.getCurrentPeriod(config, level.name)
      );
      renderAllSchoolsCard(text, results);
      if (config.voiceResponseEnabled) {
        const spoken = results.map(r => {
          if (r.error) return '';
          if (r.outsideSchedule) return `${r.level.name}: not in session.`;
          if (r.between) return `${r.level.name}: between periods.`;
          return `${r.level.name}: ${r.period}, ${r.minutesRemaining} minutes left.`;
        }).filter(Boolean).join(' ');
        if (spoken) Speech.speak(spoken);
      }
      return;
    }

    if (parsed.type === 'period-all-schools') {
      const results = config.levels.map(level =>
        ScheduleEngine.getPeriodTime(config, level.name, parsed.period)
      );
      renderAllSchoolsPeriodCard(text, parsed.period, results);
      if (config.voiceResponseEnabled) {
        const spoken = results.map(r => {
          if (r.error) return '';
          return `${r.level.name}: ${r.startFormatted} to ${r.endFormatted}.`;
        }).filter(Boolean).join(' ');
        if (spoken) Speech.speak(`Period ${parsed.period}. ${spoken}`);
      }
      return;
    }

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

  // --- All-schools "now" card ---
  function renderAllSchoolsCard(query, results) {
    cardsArea.querySelectorAll('.answer-card, .all-schools-card').forEach(c => c.classList.add('faded'));
    const card = document.createElement('div');
    card.className = 'all-schools-card';

    const rows = results.map(r => {
      const color = r.level ? r.level.accentColor : '#ccc';
      let content;
      if (r.outsideSchedule) {
        content = `<span class="asc-period">Not in session</span>`;
      } else if (r.between) {
        content = `<span class="asc-period">Between periods</span><span class="asc-detail">Next: ${escapeHtml(r.nextPeriod)} at ${escapeHtml(r.nextStartFormatted)}</span>`;
      } else {
        const minsLeft = r.minutesRemaining;
        const timeLeft = minsLeft === 1 ? '1 min left' : `${minsLeft} min left`;
        content = `<span class="asc-period">${escapeHtml(r.period)}</span><span class="asc-time">${escapeHtml(r.startFormatted)} – ${escapeHtml(r.endFormatted)}</span><span class="asc-detail">${timeLeft}</span>`;
      }
      return `<div class="asc-row" style="border-left-color:${color}"><div class="asc-school">${escapeHtml(r.level.name)}</div><div class="asc-info">${content}</div></div>`;
    }).join('');

    card.innerHTML = `<div class="card-query">"${escapeHtml(query)}"</div><div class="asc-title">Right Now</div>${rows}`;
    cardsArea.prepend(card);
  }

  // --- All-schools period time card ---
  function renderAllSchoolsPeriodCard(query, periodNum, results) {
    cardsArea.querySelectorAll('.answer-card, .all-schools-card').forEach(c => c.classList.add('faded'));
    const card = document.createElement('div');
    card.className = 'all-schools-card';

    const rows = results.map(r => {
      if (r.error) return '';
      const color = r.level.accentColor;
      return `<div class="asc-row" style="border-left-color:${color}"><div class="asc-school">${escapeHtml(r.level.name)}</div><div class="asc-info"><span class="asc-time">${escapeHtml(r.startFormatted)} – ${escapeHtml(r.endFormatted)}</span></div></div>`;
    }).filter(Boolean).join('');

    card.innerHTML = `<div class="card-query">"${escapeHtml(query)}"</div><div class="asc-title">Period ${periodNum}</div>${rows}`;
    cardsArea.prepend(card);
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
        const minsLeft = result.minutesRemaining;
        const timeLeftText = minsLeft === 1 ? '1 minute left' : `${minsLeft} minutes left`;
        progressHTML = `
          <div class="card-progress">
            <div class="card-progress-fill" style="width: ${result.progress}%; background: ${result.level.accentColor}"></div>
          </div>
          <div class="card-context">${timeLeftText}</div>
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
      const minsLeft = result.minutesRemaining;
      const timeLeftSpoken = minsLeft === 1 ? '1 minute left' : `${minsLeft} minutes left`;
      return `It's currently ${result.period} at ${result.level.name}, from ${result.startFormatted} to ${result.endFormatted}. ${timeLeftSpoken}.`;
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
