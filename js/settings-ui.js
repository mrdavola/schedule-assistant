(async () => {
  let config = await Config.get();

  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.href = '/';
  });

  if (config.darkMode) document.body.classList.add('dark-mode');

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
    reader.onload = async (ev) => {
      config.districtLogo = ev.target.result;
      const color = await ColorExtract.fromImage(ev.target.result);
      config.themeColor = color.hex;
      Config.save(config);
      ColorExtract.applyTheme(color);
      themeColorInput.value = color.hex;
      themeColorHex.textContent = color.hex;
      logoPreview.innerHTML = `<img src="${ev.target.result}" alt="Logo">`;
    };
    reader.readAsDataURL(file);
  });

  // --- Theme color picker ---
  const themeColorInput = document.getElementById('theme-color-input');
  const themeColorHex = document.getElementById('theme-color-hex');
  themeColorInput.value = config.themeColor || '#007AFF';
  themeColorHex.textContent = config.themeColor || '#007AFF';
  if (config.themeColor) {
    const r = parseInt(config.themeColor.slice(1, 3), 16);
    const g = parseInt(config.themeColor.slice(3, 5), 16);
    const b = parseInt(config.themeColor.slice(5, 7), 16);
    ColorExtract.applyTheme({ r, g, b, hex: config.themeColor });
  }

  themeColorInput.addEventListener('input', () => {
    const hex = themeColorInput.value;
    themeColorHex.textContent = hex;
    config.themeColor = hex;
    Config.save(config);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    ColorExtract.applyTheme({ r, g, b, hex });
  });

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
    document.querySelectorAll('.level-header').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('level-delete')) return;
        const idx = el.dataset.idx;
        document.getElementById(`level-body-${idx}`).classList.toggle('expanded');
      });
    });

    document.querySelectorAll('.level-delete').forEach(el => {
      el.addEventListener('click', () => {
        if (confirm(`Delete ${config.levels[el.dataset.idx].name}?`)) {
          config.levels.splice(parseInt(el.dataset.idx), 1);
          Config.save(config);
          renderLevels();
        }
      });
    });

    document.querySelectorAll('[data-field="level-name"]').forEach(el => {
      el.addEventListener('input', () => {
        config.levels[el.dataset.level].name = el.value;
        Config.save(config);
      });
    });

    document.querySelectorAll('[data-field="accent-color"]').forEach(el => {
      el.addEventListener('input', () => {
        config.levels[el.dataset.level].accentColor = el.value;
        Config.save(config);
      });
    });

    document.querySelectorAll('.alias-tag button').forEach(el => {
      el.addEventListener('click', () => {
        config.levels[el.dataset.level].aliases.splice(parseInt(el.dataset.alias), 1);
        Config.save(config);
        renderLevels();
      });
    });

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
