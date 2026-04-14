# Glow Studio ATX — AI Booking & Retention Agent
**Automated booking, confirmation, reminders, follow-ups, and reactivation for a boutique day spa — built with Next.js, Claude (Anthropic), Supabase, and Twilio**

---

## What it does

Small service businesses lose revenue in two places: no-shows from clients who forgot their appointment, and lapsed clients who never came back. This agent handles both — automatically.

Built for **Glow Studio ATX**, a fictional boutique facial spa in Austin, TX, it covers the full client lifecycle:

1. **Online booking** — service selection, real-time availability, date/time picker
2. **AI confirmation** — Claude generates a personalized confirmation message on the spot
3. **Automated notifications** — confirmation email + SMS to client, owner alert on new booking
4. **24-hour reminder** — automated reminder sent the day before the appointment via CRON
5. **Post-visit follow-up** — sent 24 hours after the appointment to collect feedback and encourage rebooking
6. **Reactivation** — clients who haven't booked in 30+ days get a personalized win-back message

Every touchpoint (reminder, follow-up, reactivation) uses Claude to generate a message personalized to the client's name, service history, and wellness goals — not a generic template.

---

## Demo

### Booking flow
Client selects a service → picks date and time → fills in contact info and wellness goals → confirms booking.

On confirmation, Claude generates a personalized message in real time:

> *"Sarah, your Custom Facial is all set for Thursday at 2:45 PM. We've noted your goal of brighter skin — Sophia will tailor the treatment specifically for you. We look forward to welcoming you."*

### Owner dashboard
Live view of upcoming appointments (grouped by today / tomorrow / next 3 days), real-time AI action log showing every automated message sent, delivery status, and trigger type.

| AI Trigger | When it fires | Channel |
|-----------|--------------|---------|
| `new_booking` | Immediately on booking | Email + SMS |
| `reminder_24h` | Day before appointment | SMS |
| `followup_24h` | Day after appointment | Email |
| `reactivation` | 30+ days since last visit | Email + SMS |

---

## Architecture

```
Client books online
        │
        ▼
Next.js API route (/api/bookings)
        │
        ├── Supabase → store booking
        ├── Twilio → SMS to client + owner
        └── Claude (Anthropic) → personalized confirmation message
        
CRON job (daily)
        │
        ├── reminder_24h  → appointments tomorrow → Claude message → Twilio SMS
        ├── followup_24h  → appointments yesterday → Claude message → email
        └── reactivation  → no booking in 30+ days → Claude message → email + SMS
```

**Stack:**
- **Next.js (App Router)** — frontend booking UI + API routes
- **Claude (Anthropic)** — personalized message generation for all 4 touchpoints
- **Supabase** — bookings database, availability tracking, AI action logs
- **Twilio** — SMS delivery (client confirmations, reminders, reactivation)
- **CRON** — scheduled jobs for reminders, follow-ups, and reactivation sequences

---

## Key features

**Real-time availability**
Booked slots are fetched live and greyed out. Past time slots (within 60 min) are automatically excluded. No double-booking.

**AI-personalized messaging at every touchpoint**
Claude receives the client's name, service, appointment time, and wellness goal for every message. Each touchpoint gets a distinct prompt — a reminder sounds different from a reactivation, which sounds different from a follow-up.

**Full AI action log**
Every automated message is logged to Supabase with trigger type, action (sms/email), result (delivered/failed), client, and timestamp. Visible on the owner dashboard in real time.

**Owner dashboard**
- 4 stat cards: total bookings, this week, pending, AI actions fired
- Upcoming appointments grouped by day with status badges
- Recent AI actions feed with trigger type, delivery status, and client info
- Auto-refreshes every 10 seconds

**Conflict handling**
If a time slot is booked between when the client loaded the page and when they submit, the system catches the 409 conflict, refreshes availability, and shows a clear error — no silent failures.

---

## Running locally

```bash
git clone https://github.com/hassan-aiml/glow-studio-atx
cd glow-studio-atx
npm install
```

Set environment variables:
```bash
ANTHROPIC_API_KEY=your_key
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

```bash
npm run dev
```

Seed demo bookings from the dashboard dev tools strip, then trigger the CRON manually to watch the AI action log populate.

---

## Pages

| Route | What it is |
|-------|-----------|
| `/book` | Client-facing booking page |
| `/dashboard` | Owner dashboard — appointments + AI action log |
| `/api/bookings` | POST — creates booking, fires confirmation |
| `/api/availability` | GET — returns booked slots for a date |
| `/api/cron` | GET/POST — runs reminder, follow-up, reactivation jobs |
| `/api/dashboard` | GET — stats, upcoming appointments, recent AI logs |

---

## What's next

- [ ] Two-way SMS — client replies "C" to confirm, "R" to reschedule
- [ ] Esthetician-specific scheduling (currently UI only)
- [ ] Review request automation after follow-up
- [ ] Multi-location support
- [ ] White-label config for other service businesses (cleaning, HVAC, plumbing)

---

## About

Built by Hassan Hai — exploring applied AI for small service businesses. This is one of three projects in my AI portfolio, alongside a NOC triage agent for telecom operations and an AI-powered field inspection tool.

[LinkedIn](https://linkedin.com/in/your-profile) · [NOC Triage Agent](https://github.com/hassan-aiml/noc-triage-agent)
