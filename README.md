# RoktoSetu — Blood Donor Matching App

Real-time blood donor search and emergency request broadcast.
Stack: static HTML/CSS/JS + Firebase Auth + Cloud Firestore (no build step).

## Structure
- `public/index.html`  — production app (Firebase Auth + Firestore, real-time)
- `demo/index.html`    — offline demo (localStorage, no Firebase needed)
- `firestore.rules`    — Firestore security rules
- `firebase.json`, `.firebaserc`, `firestore.indexes.json` — Firebase CLI config

## Setup
1. Create a project at https://console.firebase.google.com and add a **Web app**.
2. `public/index.html` already contains the RoktoSetu Firebase config (project `roktosetu-17f6d`).
3. Authentication → Sign-in method: enable **Email/Password** and **Google**.
4. Create a **Firestore** database (production mode).
5. `.firebaserc` is already set to `roktosetu-17f6d`.
6. Deploy:
   ```
   npm i -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules,hosting
   ```
7. Authentication → Settings → **Authorized domains**: add your hosting domain.

Local test: `firebase emulators:start` or `npx serve public` (must be http://localhost, not file://).

## Auth
- Login and Register are separate tabs. Sign-in by Email + password, BD Phone + password, or Google.
- Phone + password is stored as a private email alias (`01XXXXXXXXX@phone.roktosetu.app`) under the Email/Password provider. It does not verify phone ownership by OTP; use Firebase Phone Auth (Blaze plan) if you need that.
- Password reset works for real email accounts only.

## Location & map
- Donors can set a location with GPS ("Use my current location") or by tapping/dragging a pin on a map. Stored coordinates are **rounded to 2 decimals (~1 km)**, so exact home locations are never exposed.
- Find Donor: List / Map toggle, "Use my location" for real distance sorting, and a radius filter (5-100 km). The map shows donors, open requests (orange) and your position.
- Emergency requests can carry a hospital location: shows "Open in Maps" + distance, and matching uses donors within 25 km (falls back to district when no location is set).
- Map uses Leaflet + OpenStreetMap tiles (fine for light traffic; for heavy use switch to a tile provider such as MapTiler or Mapbox and follow the OSM tile usage policy).
- Scale note: the app currently listens to the whole `donors` collection and filters on the client. For thousands of donors, add a geohash field (geofire-common) and query by radius.

## Blood bank & hospital directory
- **Directory** tab: search, filter by type/district/24-7, list or map view, distance sorting, Call and Directions, per-blood-group stock chips with "updated" time.
- Any signed-in member can **add a facility**; it appears as *Unverified* until an admin verifies it. The submitter (and admins) can update stock and edit; only admins can verify or delete verified listings.
- Emergency request cards have a **Blood banks** shortcut that opens the directory filtered to the request's district.
- **Make an admin:** Console > Firestore > create a document `admins/<the user's uid>` (any field, e.g. `role: "admin"`). Clients cannot write to `admins`.
- **Bulk import** verified data: see `scripts/import-facilities.mjs` and `scripts/facilities.template.json` (needs a service account key). No phone numbers are pre-filled; add only numbers you have confirmed.

## PWA (installable app)
- `public/manifest.webmanifest`, `public/sw.js`, `public/icon-*.png` — installable on Android/desktop Chrome/Edge, and on iOS via Safari "Add to Home Screen" (iOS doesn't show an install prompt; the manifest still makes the Home Screen icon look native).
- Offline: the app shell (HTML/CSS/JS + icons) and map tiles are cached, so the UI still opens with no signal. Live donor/request/facility data needs a connection — Firestore's own offline cache will show the last-synced snapshot if the browser has visited recently.
- The service worker only registers on HTTPS (or when deployed), never on `localhost`, so local `npx serve` testing is unaffected. Whenever you change `public/index.html`, bump the `V` constant in `public/sw.js` (e.g. `roktosetu-v2`) so returning visitors get the update instead of a stale cached copy.
- Icons were generated programmatically; swap `public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` for real branded artwork whenever you have one.

## Bangla (বাংলা) toggle
- Button top-right (বাং/EN) switches the whole UI — nav, headings, forms, buttons, empty states — and remembers the choice (`localStorage`) and auto-detects a Bengali browser locale on first visit.
- Font: Noto Sans Bengali (Google Fonts) loads only when needed.
- Scope: all page chrome is translated. A handful of toast/status messages (confirmation popups after actions) are still English-only; translate more of `I18N.bn` in `public/index.html` as needed — the keys are self-explanatory.
- User-entered content (names, hospital names, notes) is never translated — it displays exactly as typed.

## Data model
- `facilities/{id}`: name, type (Blood Bank | Hospital | Voluntary Org), d, addr, ph, h24, hours, lat?, lng?, verified, uid, t, stock{group:units}?, stockAt?
- `admins/{uid}`: presence = admin
- `donors/{uid}`: name, g, d, ph, lastMs, av, off[lat,lng], lat?, lng? (rounded ~1 km), uid
- `requests/{id}`: pt, g, u, h, d, ph, urg, note, uid, lat?, lng?, t, responders[], done

## Before going live
- Enable Firebase **App Check** and email verification.
- Real SMS/push alerts need a Cloud Function (Firestore trigger on `requests`) + FCM or an SMS gateway.
- Demo app data is stored only in the browser.
