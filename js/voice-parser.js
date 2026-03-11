const VoiceParser = (() => {

  function parse(text, config) {
    const t = text.toLowerCase().trim();

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

    const periodMatch = t.match(/period\s+(\d{1,2})/);
    const period = periodMatch ? parseInt(periodMatch[1]) : null;

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

    const wordNums = {
      'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
      'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
      'eleven': '11', 'twelve': '12'
    };
    if (!time) {
      const wordTimeMatch = t.match(/(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*o'?\s*clock/i);
      if (wordTimeMatch) {
        time = wordNums[wordTimeMatch[1].toLowerCase()] + ':00';
      }
    }

    const isNow = /right now|currently|current|is it now|now at/.test(t);
    const isWhatTime = /what time|when is|when does|start|begin/.test(t);

    if (isWhatTime && period && school) return { type: 'period-to-time', school, period };
    if (time && school && !period) return { type: 'time-to-period', school, time };
    if ((isNow || (!time && !period)) && school) return { type: 'now-to-period', school };
    if (period && school) return { type: 'period-to-time', school, period };
    if (school && !period && !time) return { type: 'now-to-period', school };

    return { type: 'unknown', raw: text, school, period, time };
  }

  return { parse };
})();
