const Config = (() => {
  const STORAGE_KEY = 'schedule-assistant-config';
  let _defaultConfig = null;

  async function loadDefault() {
    if (_defaultConfig) return _defaultConfig;
    const resp = await fetch('config-default.json');
    _defaultConfig = await resp.json();
    return _defaultConfig;
  }

  async function get() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch (e) { /* fall through */ }
    }
    return await loadDefault();
  }

  function save(config) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  function exportJSON(config) {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.districtName || 'schedule'}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target.result);
          if (!config.levels || !Array.isArray(config.levels)) {
            reject(new Error('Invalid config: missing levels array'));
            return;
          }
          save(config);
          resolve(config);
        } catch (err) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.readAsText(file);
    });
  }

  async function reset() {
    localStorage.removeItem(STORAGE_KEY);
    return await loadDefault();
  }

  return { get, save, exportJSON, importJSON, reset, loadDefault };
})();
