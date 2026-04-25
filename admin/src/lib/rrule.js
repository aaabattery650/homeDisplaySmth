const DAY_CODES = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export function buildRRuleString({ frequency, interval, byDay, endCondition, count, until }) {
  if (!frequency || frequency === 'none') return null;

  const parts = [`FREQ=${frequency.toUpperCase()}`];

  if (interval && interval > 1) {
    parts.push(`INTERVAL=${interval}`);
  }

  if (frequency === 'weekly' && byDay && byDay.length > 0) {
    parts.push(`BYDAY=${byDay.join(',')}`);
  }

  if (endCondition === 'count' && count) {
    parts.push(`COUNT=${count}`);
  } else if (endCondition === 'until' && until) {
    parts.push(`UNTIL=${until.replace(/-/g, '')}T235959Z`);
  }

  return parts.join(';');
}

export function parseRRuleString(rruleStr) {
  const result = {
    frequency: 'none',
    interval: 1,
    byDay: [],
    endCondition: 'never',
    count: 10,
    until: '',
  };

  if (!rruleStr) return result;

  const parts = rruleStr.split(';');
  for (const part of parts) {
    const [key, val] = part.split('=');
    switch (key) {
      case 'FREQ':
        result.frequency = val.toLowerCase();
        break;
      case 'INTERVAL':
        result.interval = Number(val);
        break;
      case 'BYDAY':
        result.byDay = val.split(',');
        break;
      case 'COUNT':
        result.endCondition = 'count';
        result.count = Number(val);
        break;
      case 'UNTIL':
        result.endCondition = 'until';
        result.until = val.slice(0, 4) + '-' + val.slice(4, 6) + '-' + val.slice(6, 8);
        break;
    }
  }

  return result;
}

export { DAY_CODES };
