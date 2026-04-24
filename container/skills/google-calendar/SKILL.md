# Google Calendar

Schedule meetings, check availability, and manage calendar events through Google Calendar.

## Usage

Ask Fib to:
- "Schedule a meeting with [name] for [date] at [time]"
- "What's my schedule for [date]?"
- "When am I free this week?"
- "Create an event called [name] on [date]"
- "Delete the [event name] event"

## Capabilities

- ✅ Create events with title, date, time, location, attendees
- ✅ Read calendar events for date ranges
- ✅ Check free/busy time
- ✅ Delete events
- ✅ List upcoming events

## Configuration

Google Calendar is configured with OAuth2 authentication. Credentials are stored securely in `~/.config/agent-skills/google.yaml`.

## Examples

Fib can understand requests like:
- "Schedule a team standup for tomorrow at 9am for 30 minutes"
- "Am I free on Friday between 2-3pm?"
- "Create a 1-hour meeting called 'Project Review' on April 25 at 2pm"
- "Show me all events next week"
