const ScheduleEngine = (() => {

  function toMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  function formatTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  }

  function findLevel(config, schoolQuery) {
    const q = schoolQuery.toLowerCase().trim();
    for (const level of config.levels) {
      if (level.name.toLowerCase() === q || level.id.toLowerCase() === q) return level;
      for (const alias of level.aliases) {
        if (alias.toLowerCase() === q) return level;
      }
    }
    for (const level of config.levels) {
      if (q.includes(level.name.toLowerCase()) || level.name.toLowerCase().includes(q)) return level;
      for (const alias of level.aliases) {
        if (q.includes(alias.toLowerCase()) || alias.toLowerCase().includes(q)) return level;
      }
    }
    return null;
  }

  function getPeriodTime(config, schoolQuery, periodNum) {
    const level = findLevel(config, schoolQuery);
    if (!level) return { error: `I couldn't find a school matching "${schoolQuery}".` };
    const periodKey = `Period ${periodNum}`;
    const times = level.schedule[periodKey];
    if (!times) return { error: `Period ${periodNum} doesn't exist at ${level.name}.` };
    return {
      period: periodKey, start: times[0], end: times[1],
      startFormatted: formatTime(times[0]), endFormatted: formatTime(times[1]), level
    };
  }

  function getCurrentPeriod(config, schoolQuery, nowDate) {
    const level = findLevel(config, schoolQuery);
    if (!level) return { error: `I couldn't find a school matching "${schoolQuery}".` };
    const now = nowDate || new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const periods = Object.entries(level.schedule);
    for (const [periodKey, [start, end]] of periods) {
      const startMins = toMinutes(start);
      const endMins = toMinutes(end);
      if (nowMins >= startMins && nowMins < endMins) {
        const progress = (nowMins - startMins) / (endMins - startMins);
        const minutesRemaining = endMins - nowMins;
        return {
          period: periodKey, start, end,
          startFormatted: formatTime(start), endFormatted: formatTime(end),
          level, progress: Math.round(progress * 100), minutesRemaining
        };
      }
    }
    const allStarts = periods.map(([, [s]]) => toMinutes(s));
    const allEnds = periods.map(([, [, e]]) => toMinutes(e));
    const firstStart = Math.min(...allStarts);
    const lastEnd = Math.max(...allEnds);
    if (nowMins < firstStart || nowMins >= lastEnd) return { outsideSchedule: true, level };
    for (const [periodKey, [start]] of periods) {
      if (toMinutes(start) > nowMins) {
        return { between: true, nextPeriod: periodKey, nextStart: start, nextStartFormatted: formatTime(start), level };
      }
    }
    return { outsideSchedule: true, level };
  }

  function getPeriodAtTime(config, schoolQuery, timeStr) {
    let hours, minutes;
    const pmMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
    const milMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (pmMatch) {
      hours = parseInt(pmMatch[1]);
      minutes = parseInt(pmMatch[2] || '0');
      if (pmMatch[3].toLowerCase() === 'pm' && hours !== 12) hours += 12;
      if (pmMatch[3].toLowerCase() === 'am' && hours === 12) hours = 0;
    } else if (milMatch) {
      hours = parseInt(milMatch[1]);
      minutes = parseInt(milMatch[2]);
      if (hours >= 1 && hours <= 6) hours += 12;
    } else {
      const bare = parseInt(timeStr);
      if (!isNaN(bare)) {
        hours = bare >= 1 && bare <= 6 ? bare + 12 : bare;
        minutes = 0;
      } else {
        return { error: `I couldn't understand the time "${timeStr}".` };
      }
    }
    const fakeDate = new Date();
    fakeDate.setHours(hours, minutes, 0, 0);
    return getCurrentPeriod(config, schoolQuery, fakeDate);
  }

  return { getPeriodTime, getCurrentPeriod, getPeriodAtTime, findLevel, formatTime };
})();
