const VoiceParser = (() => {

  const wordToNum = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'first': 1, 'second': 2, 'third': 3,
    'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8,
    'ninth': 9, 'tenth': 10
  };

  const wordNumPattern = Object.keys(wordToNum).join('|');

  function parse(text, config) {
    const t = text.toLowerCase().trim();

    // Extract school name by matching against all aliases
    let school = null;
    let longestMatch = 0;
    for (const level of config.levels) {
      const candidates = [level.name, level.id, ...level.aliases];
      for (const alias of candidates) {
        if (t.includes(alias.toLowerCase()) && alias.length > longestMatch) {
          school = alias;
          longestMatch = alias.length;
        }
      }
    }

    // Extract period number — digit or word form
    let period = null;
    const digitMatch = t.match(/period\s+(\d{1,2})/);
    if (digitMatch) {
      period = parseInt(digitMatch[1]);
    } else {
      const wordMatch = t.match(new RegExp(`period\\s+(${wordNumPattern})`, 'i'));
      if (wordMatch) {
        period = wordToNum[wordMatch[1].toLowerCase()];
      }
    }

    // Extract time
    let time = null;
    const timePatterns = [
      /(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
      /(\d{1,2}\s*(?:am|pm))/i,
      /at\s+(\d{1,2}(?::\d{2})?)/i,
    ];
    for (const pattern of timePatterns) {
      const match = t.match(pattern);
      if (match) {
        time = match[1].trim();
        break;
      }
    }

    // Word-based time ("two o'clock")
    if (!time) {
      const wordTimeMatch = t.match(new RegExp(`(${wordNumPattern})\\s*o'?\\s*clock`, 'i'));
      if (wordTimeMatch) {
        time = wordToNum[wordTimeMatch[1].toLowerCase()] + ':00';
      }
    }

    const isNow = /right now|currently|current|is it now|now at|right now/.test(t);
    const isWhatTime = /what time|when is|when does|start|begin/.test(t);
    const isAllSchools = !school && (isNow || /what period/.test(t));

    // "What period is it right now" (no school) → show all schools
    if (isAllSchools && !period && !time) {
      return { type: 'now-all-schools' };
    }

    if (isWhatTime && period && school) return { type: 'period-to-time', school, period };
    if (time && school && !period) return { type: 'time-to-period', school, time };
    if ((isNow || (!time && !period)) && school) return { type: 'now-to-period', school };
    if (period && school) return { type: 'period-to-time', school, period };
    if (school && !period && !time) return { type: 'now-to-period', school };

    // If we have a period but no school, show all schools for that period
    if (period && !school) return { type: 'period-all-schools', period };

    return { type: 'unknown', raw: text, school, period, time };
  }

  return { parse };
})();
