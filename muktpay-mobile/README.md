# MuktPay Mobile

Expo (SDK 57) + Expo Router app for MuktPay. Customers scan a shop's UPI QR code and pay in
their own UPI app. Merchants create bills, split large amounts into several payments, and show
a QR code per payment. MuktPay never holds or processes money.

## Requirements

- Node.js LTS and npm
- The MuktPay backend running (see the repository root `README.md`)
- A phone with Expo Go, or an Android emulator

## Run locally

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go. The phone and the computer must be on the same Wi-Fi.
In development the app finds the backend at `http://<your-computer-LAN-IP>:4000/api`.
To point it somewhere else, copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run android` | Start and open on an Android device or emulator |
| `npm test` | Run unit tests (UPI parser, money formatting, split engine) |
| `npm run lint` | Lint the project |

## Configuration

| Variable | Required | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Release builds | `https://` URL ending in `/api`. Release builds refuse to start without a valid one. |

## Project layout

```
src/app/         Screens and routes (Expo Router)
src/components/  Shared UI components
src/features/    Auth, merchant, role, split and other feature code
src/services/    UPI link building, parsing and launching
src/lib/         API client, config, token storage
src/theme/       Colours, spacing, typography
```
