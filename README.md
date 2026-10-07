# fc-league

Vite + React project configured for Firebase.

Project: `fc-league-26061` (Standard Firestore in `asia-south2`).

```bash
npm install
npm run emulators   # Auth :9099, Firestore :8080, UI http://localhost:4000
npm run dev         # http://localhost:5173
npm run build
npm run deploy      # auth, Firestore rules/indexes, and Hosting
```

`npm run dev` uses the emulators (`.env.development`). Production builds use the cloud project.

The Firestore emulator needs JDK 21 or newer. If `java -version` is older, `npm run emulators` uses Homebrew OpenJDK at `/opt/homebrew/opt/openjdk` when it is installed.

Firebase web config, Auth, Firestore, and Analytics live in `src/lib`. Hosting serves `dist`. GitHub deploy workflows need the `FIREBASE_SERVICE_ACCOUNT_FC_LEAGUE_26061` secret.

## Admin bootstrap

Viewers read the league without an account. A write is allowed only when the signed-in user has an `admins/{uid}` document. Clients cannot create or edit that collection.

1. In the Firebase console, add an email/password user.
2. Copy that user's UID.
3. Create a Firestore document at `admins/{uid}` with a `createdAt` timestamp.

The seed script creates `admin@fc.local` / `admin123` and the matching `admins/{uid}` document in the emulators.

## Seed

Start the emulators (`npm run emulators`), then in another terminal:

```bash
node scripts/seed.js
```

This writes one league, six players, a completed double round-robin season, and an active single round-robin season with about half of its matches played.

## Rules tests

```bash
npm run test:rules
```

`scripts/test-rules.sh` uses JDK 21 or newer, with the same Homebrew OpenJDK fallback as `npm run emulators`. It runs `tests/rules` against the Firestore emulator for project `fc-league-26061` on `127.0.0.1:8080`.
