# CollectoVault Mobile App (Expo + React Native)

This is a React Native mobile app built with Expo that mirrors the features and API calls from the CollectoVault web application.

## 📋 Prerequisites

- **Node.js** (v16 or higher) — [Download](https://nodejs.org/)
- **npm** or **yarn** installed
- **Expo CLI** (installed via npm during setup)
- **Android Studio** (for Android development) — [Download](https://developer.android.com/studio)
- **Xcode** (for iOS development; macOS only) — [Download from App Store](https://apps.apple.com/us/app/xcode/id497799835)
- **Expo Go app** on your phone (optional, for testing without emulator)

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd "D:\Cissy technologies\CollectoVault\collectovaultapp"
npm install
```

### 2. Configure Environment
Copy and update the `.env` file with your API base URL:
```bash
cp .env.example .env
```

Edit `.env`:
```
EXPO_PUBLIC_API_BASE_URL=https://your-api-url.com
```

### 3. Start the Dev Server
```bash
npm start
```

This will open an interactive menu in the terminal:
```
› Press a to open Android
› Press i to open iOS  
› Press w to open web
› Press r to reload app
› Press q to quit
```

### 4. Run on Android
#### Option A: Android Emulator (Recommended for first time)
```bash
npm run android
```
This automatically opens the Android emulator and installs the app.

#### Option B: Physical Android Device
1. Connect your Android phone via USB and enable USB debugging
2. Run the same command:
```bash
npm run android
```

### 5. Run on iOS (macOS only)
#### Option A: iOS Simulator
```bash
npm run ios
```

#### Option B: Physical iPhone
1. Connect your iPhone
2. Trust the computer on your device
3. Run:
```bash
npm run ios
```

### 6. Run on Web (Browser)
```bash
npm run web
```

## 📁 Project Structure

```
collectovaultapp/
├── app/                        # Expo Router pages (file-based routing)
│   ├── (tabs)/                 # Tabbed dashboard layout
│   ├── login.tsx               # Login screen
│   ├── _layout.tsx             # Root navigation layout
│   └── modal.tsx               # Modal example
├── src/
│   ├── api/                    # API calls
│   │   ├── index.ts            # Axios config & token management
│   │   ├── authService.ts      # Authentication (login, logout, OTP)
│   │   ├── customer.ts         # Customer data endpoints
│   │   └── collectovault.ts    # Points, tier, packages endpoints
│   ├── context/
│   │   └── AuthContext.tsx     # Global auth state management
│   ├── screens/                # Reusable screen components
│   └── components/             # Reusable React components
├── package.json
├── tsconfig.json
├── app.json                    # Expo config
├── .env                        # Environment variables (DO NOT commit)
└── .env.example                # Template for .env
```

## 🔐 Authentication Flow

1. **User enters username** on login screen
2. **App calls** `authService.loginByUsername()`
3. **Backend responds** with OTP or token
4. **Token stored** in AsyncStorage automatically
5. **Tokens attached** to all API requests via interceptors
6. **On 401/403** tokens are cleared automatically

### Stored Data
- `clientId` — Unique user identifier
- `collectoId` — Vendor/business identifier
- `userName` — User's chosen username
- `vaultOtpToken` — JWT auth token (expires in 30 min)
- `vaultOtpExpiresAt` — Token expiry timestamp

## 📱 Key Features Ported

✅ **Authentication**
- Login with username
- OTP verification (optional)
- Automatic token refresh
- Secure logout

✅ **API Endpoints**
- Point rules & tier information
- Vault packages & pricing
- Customer data & profiles
- Services & offerings
- Redeemable offers

✅ **State Management**
- Global auth context (React Context)
- Persistent user session
- Automatic session restoration on app start

## 🔧 Customization

### Change API Base URL
Edit `.env`:
```
EXPO_PUBLIC_API_BASE_URL=https://new-api-url.com
```

### Change App Icon & Name
Edit `app.json`:
```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug"
  }
}
```

### Add Custom Screens
1. Create `.tsx` file in `app/` folder (e.g., `app/dashboard.tsx`)
2. File path automatically becomes a route
3. Use `useRouter` from `expo-router` to navigate

## 📦 Dependencies

- **expo** — React Native framework for both iOS & Android
- **axios** — HTTP client for API calls
- **@react-navigation/native** — Navigation library
- **@react-navigation/native-stack** — Stack navigator
- **@react-navigation/bottom-tabs** — Bottom tab navigator
- **@react-native-async-storage/async-storage** — Persistent storage (replaces localStorage)
- **typescript** — Type safety

## 🧪 Testing on Devices

### Without Emulator (Easiest)
1. Download **Expo Go** app on your phone
2. Run: `npm start`
3. Scan the QR code with your phone camera
4. App opens immediately in Expo Go

### With Android Emulator
- Android Studio includes a built-in emulator
- Run: `npm run android` (handles everything automatically)

### With iOS Simulator
- Xcode includes iOS Simulator (macOS only)
- Run: `npm run ios`

## 🐛 Troubleshooting

### Port Conflict Error
```bash
# If port 8081 is already in use:
npm start -- --port 8080
```

### Clear Cache
```bash
npm start -- --clear
```

### Reset Everything
```bash
rm -rf node_modules .expo
npm install
npm start
```

### Token Expired
- Tokens expire after 30 minutes
- App will auto-clear and show login screen
- Just log in again

### API Connection Failed
- Check `.env` has correct API base URL
- Ensure backend is running and accessible
- Check network connectivity

## 📞 Support

For issues or questions:
1. Check your `.env` file is configured correctly
2. Review API response errors in console
3. Ensure all npm packages installed: `npm install`
4. Try clearing cache: `npm start -- --clear`

## ✅ Next Steps

1. **Run the app** using instructions above
2. **Test login** with your backend
3. **Port customer screens** from web (see next steps)
4. **Add features** incrementally
5. **Test on real devices** before deployment

---

**Happy coding! 🚀**
