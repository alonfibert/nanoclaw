import { spawn } from 'child_process';

export async function runGoogleCalendarCommand(command, params) {
  return new Promise((resolve, reject) => {
    const args = ['/home/node/.claude/skills/google-calendar/scripts/google-calendar.py', command];

    // Build arguments from params
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        args.push(`--${key.replace(/_/g, '-')}`, value);
      }
    });

    const proc = spawn('python3', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || 'Command failed'));
      }
    });
  });
}

// Export tool functions
export const tools = {
  async listCalendarEvents({ time_min, time_max }) {
    return runGoogleCalendarCommand('events list', { time_min, time_max });
  },

  async createCalendarEvent({ summary, start, end, location, attendees, description }) {
    return runGoogleCalendarCommand('events create', {
      summary,
      start,
      end,
      location,
      attendees,
      description,
    });
  },

  async deleteCalendarEvent({ event_id }) {
    return runGoogleCalendarCommand('events delete', { event_id });
  },

  async checkAvailability({ start, end }) {
    return runGoogleCalendarCommand('freebusy', { start, end });
  },
};
