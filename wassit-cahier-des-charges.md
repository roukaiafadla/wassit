# Wassit (وسيط) — Cahier des Charges

## 1. Concept

A hyperlocal services marketplace. A client posts a job in plain text ("my sink is leaking, need someone tonight"), the platform detects the category and suggests a price range using AI, nearby verified providers get notified in real time, and they compete by sending live offers. Client picks one, chats, gets the job done, both rate each other.

## 2. Roles

- **Client** — posts jobs, receives/accepts offers, chats, rates
- **Provider** — sets categories + coverage radius, gets live alerts, sends offers, builds reputation
- **Admin** — verifies providers, resolves disputes, monitors platform via dashboard

## 3. Functional scope (MVP)

- Auth: signup/login, role selection, JWT sessions
- Job posting: free-text description → AI categorization + urgency + suggested price range
- Real-time job broadcast to eligible nearby providers (Socket.io + geospatial query)
- Offer system: providers submit price + ETA, client sees offers arrive live
- Job matching: client accepts one offer, others auto-close
- Chat: 1:1, scoped to a matched job
- Reviews: rating + comment after job completion, feeds provider's public rating
- Provider dashboard: active/past jobs, coverage area, earnings summary, rating
- Admin dashboard: pending provider verifications, flagged disputes, demand-by-category/area chart

### Out of scope for MVP (v2 ideas)
- In-app payments (start with "pay in person", add Stripe escrow later)
- Multi-language UI (start Arabic/French/English content, structure i18n-ready but don't fully localize yet)
- Push notifications via native mobile app (web notifications only for MVP)
- Recurring/scheduled jobs (only "now" jobs for MVP)

## 4. Data model

**Users**
`_id, name, email, passwordHash, role [client|provider|admin], location {type:Point, coordinates}, categories[] (providers only), coverageRadiusKm (providers only), verified (providers only), ratingAvg, ratingCount, createdAt`

**Jobs**
`_id, clientId, description, category, urgency [low|medium|high], suggestedPriceMin, suggestedPriceMax, location {type:Point, coordinates}, status [open|matched|completed|cancelled], acceptedOfferId, createdAt`

**Offers**
`_id, jobId, providerId, price, etaMinutes, status [pending|accepted|rejected|withdrawn], createdAt`

**Conversations**
`_id, jobId, clientId, providerId, createdAt`

**Messages**
`_id, conversationId, senderId, text, createdAt, readAt`

**Reviews**
`_id, jobId, fromUserId, toUserId, rating (1-5), comment, createdAt`

## 5. Key flows

1. **Post a job** — client types description → AI call returns `{category, urgency, priceMin, priceMax}` → client confirms/edits → job created with status `open` → geospatial query finds providers matching category within radius → Socket.io emits `job:new` to those providers' rooms

2. **Live offers** — provider sends offer → saved → Socket.io emits `offer:new` to client's room → client's screen updates live without refresh

3. **Accept an offer** — client accepts → job status → `matched`, other offers → `rejected`, conversation auto-created → both parties notified

4. **Chat** — scoped to conversation, Socket.io rooms per conversation, typing indicators, read receipts

5. **Complete + review** — either party marks job `completed` → both prompted to review the other → ratings recalculated

6. **Provider verification** — new provider signs up unverified → appears in admin queue → admin approves/rejects (with optional ID/document upload) → provider can now receive jobs

## 6. AI features

- **Job categorization**: free text → structured `{category, urgency}` via LLM prompt with a fixed category list (plumbing, electrical, tutoring, moving, cleaning, tech repair, etc.)
- **Price suggestion**: category + urgency + (optionally) location → suggested price range, seeded with a manual baseline table per category, refined by prompt
- **v2 idea**: sentiment analysis on reviews to flag providers trending negative before rating average catches it

## 7. Stack

- **Frontend**: React + Tailwind, Recharts (admin charts), Leaflet or Google Maps (coverage/nearby view)
- **Backend**: Node.js, Express, MongoDB (geospatial `2dsphere` index + `$near`)
- **Real-time**: Socket.io — rooms per user, per conversation
- **Auth**: JWT, role-based middleware
- **AI**: Claude or Gemini API, server-side calls only (never expose key client-side)
- **Deployment**: Vercel (frontend), Render or Railway (backend), MongoDB Atlas — free tiers for portfolio purposes

## 8. Build order (suggested)

1. Auth + roles + basic CRUD for jobs (no AI, no real-time yet — prove the data model)
2. Add geospatial matching (static "nearby providers" list, no sockets yet)
3. Add Socket.io for live job broadcast + live offers
4. Add AI categorization/pricing to the job form
5. Chat
6. Reviews + rating recalculation
7. Admin dashboard last — it's the least essential for a working demo, most cuttable if time runs short
