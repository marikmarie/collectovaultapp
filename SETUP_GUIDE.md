# CollectoVault Mobile App - Complete Setup Guide

This guide walks you through everything you need to run the React Native Expo app on Android and iOS.

---

## 🖥️ System Requirements

### For All Platforms
- **Node.js** v16+ ([Download](https://nodejs.org/))
- **npm** v7+ (comes with Node.js)

### For Android Development
- **Java Development Kit (JDK)** 11+
- **Android SDK** (Android 12 or higher recommended)
- **Android Studio** ([Download](https://developer.android.com/studio))
  - Includes emulator, SDK manager, and build tools

### For iOS Development (macOS only)
- **macOS** 12+
- **Xcode** 13+ ([Download from App Store](https://apps.apple.com/us/app/xcode/id497799835))
- **CocoaPods** (installed automatically with Xcode)

### Optional: For Testing Without Emulator
- **Expo Go** mobile app ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/us/app/expo-go/id982107779))

---

## 📦 Step 1: Initial Setup

### 1.1 Navigate to Project Directory
```powershell
cd "D:\Cissy technologies\CollectoVault\collectovaultapp"
```

### 1.2 Install Dependencies
```bash
npm install
```

This installs:
- React Native & Expo runtime
- Navigation libraries
- AsyncStorage for data persistence
- Axios for HTTP requests

**Expected time:** 2-5 minutes

### 1.3 Verify Installation
```bash
npm list
```

Should show no errors. Key packages:
```
expo@54.0.33
react-native@0.73.2
@react-navigation/native@7.1.31
axios@1.13.6
```

---

## ⚙️ Step 2: Environment Configuration

### 2.1 Create .env File
```bash
cp .env.example .env
```

### 2.2 Edit .env with Your API
Open `.env` and update:
```
# Local development (if backend runs on localhost:3000)
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3000

# Production
EXPO_PUBLIC_API_BASE_URL=https://api.collectovault.com

# Staging
EXPO_PUBLIC_API_BASE_URL=https://staging-api.collectovault.com
```

**⚠️ Important:** On Android/iOS simulator or real devices, use your machine's network IP (not localhost).

Find your IP:
```powershell
# Windows PowerShell
ipconfig
```

Look for "IPv4 Address" under your network adapter (e.g., `192.168.1.100`)

---

## 🚀 Step 3: Running the App

### 3.1 Start Expo Development Server
```bash
npm start
```

You'll see a menu:
```
› Press a → opens in Android Emulator
› Press i → opens in iOS Simulator
› Press w → opens in Web Browser
› Press r → reload app
› Press m → toggle menu
› Press q → quit
```

### 3.2 Choose Your Platform

---

## 📱 **ANDROID Setup & Run**

### Prerequisites Check
```bash
# Check Java installed
java -version

# Check Android SDK installed
echo %ANDROID_HOME%
```

Should output a path like `C:\Users\YourName\AppData\Local\Android\Sdk`

### Option A: Android Emulator (Recommended for Testing)

#### First Time Setup
1. Open **Android Studio**
2. Click **Tools** → **AVD Manager**
3. Click **Create Virtual Device**
4. Select **Pixel 6** (or any recent model)
5. Select **Android 13+** (or higher)
6. Click **Finish**

#### Run App
```bash
npm run android
```

This will:
- Start the Android emulator automatically
- Build the app
- Install and launch it

**Expected output:**
```
✓ Build complete
App installed successfully
Opening in Android Emulator...
```

**Troubleshooting:**
- If emulator doesn't start: Open Android Studio → AVD Manager → click **Play** button on your device
- If connection error: Check `.env` `API_BASE_URL` uses correct IP (not `localhost`)

---

### Option B: Physical Android Device

#### Prerequisites
1. Enable **Developer Mode** on your phone:
   - Go to **Settings** → **About Phone**
   - Tap **Build Number** 7 times until you see "Developer Mode enabled"

2. Enable **USB Debugging**:
   - Go to **Settings** → **Developer Options**
   - Toggle **USB Debugging** ON

3. Connect phone via USB cable

#### Run App
```bash
npm run android
```

The app will:
- Build for your connected phone
- Install automatically
- Launch

**Verify connection:**
```bash
adb devices
```

Should show your phone in the list.

---

## 🍎 **iOS Setup & Run** (macOS Only)

### Prerequisites
Xcode must be installed with command line tools:
```bash
xcode-select --install
```

### Option A: iOS Simulator (Fastest)

```bash
npm run ios
```

This will:
- Start iOS Simulator
- Build the app
- Install and launch it

**First run takes ~2-3 minutes for initial build.**

**Troubleshooting:**
- If simulator doesn't open: Open Xcode → **Product** → **Destination** → select simulator → **Run**
- If memory error: Close simulator and run again

---

### Option B: Physical iPhone

#### Prerequisites
1. Connect iPhone via USB cable
2. Trust the device (tap **Trust** on phone screen)
3. Xcode needs your Apple Developer Account (can use free account)

#### Run App
```bash
npm run ios
```

When prompted, select your device.

---

## 🌐 **WEB Browser Testing**

Quick test in your browser (limited mobile features):

```bash
npm run web
```

Opens at `http://localhost:8081` with:
- Login screen
- Basic navigation
- All API calls work

---

## ✅ Verification Checklist

After starting the app, verify:

- [ ] **Login screen loads** (shows "CollectoVault" title)
- [ ] **Input field works** (try typing a username)
- [ ] **Button responds** (tap to trigger login)
- [ ] **No red error screen** (console shows no JS errors)

### Check Console Errors
In terminal running `npm start`, look for:
- ❌ Red errors (app problems)
- ⚠️ Yellow warnings (usually OK to ignore)
- ✅ Green messages (app loaded successfully)

---

## 🔧 Common Commands

```bash
# Clear cache and restart
npm start -- --clear

# Run with verbose logging
npm start -- --verbose

# Kill all Expo processes
npx expo-cli send SIGTERM

# Clear all folders and reinstall
rm -r node_modules .expo && npm install

# Run on specific port if 8081 conflicts
npm start -- --port 8090
```

---

## 🐛 Troubleshooting

### "Cannot connect to API"
**Solution:**
1. Check `.env` has correct `EXPO_PUBLIC_API_BASE_URL`
2. On emulator/device, use computer's IP (not `localhost`)
3. Verify backend is running: `curl YOUR_IP:3000`
4. Check firewall isn't blocking port

### "Device not found"
**Solution:**
1. Disconnect and reconnect USB cable
2. For Android: `adb kill-server && adb devices`
3. For iOS: Unplug and replug, trust device again

### "Android build fails"
**Solution:**
```bash
# Clear Android build cache
rm -r android/.gradle
npm run android
```

### "Port 8081 already in use"
**Solution:**
```bash
# Use different port
npm start -- --port 8090
```

### "Out of memory"
**Solution:**
- Close other apps
- For Android: Close emulator and reopen it
- For iOS: Restart simulator

### "Blank white screen"
**Solution:**
1. Check `npm start` console for errors
2. Run `npm start -- --clear`
3. Try reloading: Press `r` in terminal

---

## 📂 Project Files Overview

```
collectovaultapp/
├── src/api/
│   ├── index.ts              ← Axios config & auth interceptors
│   ├── authService.ts        ← Login, logout, token management
│   ├── customer.ts           ← Customer data endpoints
│   └── collectovault.ts      ← Points & tier endpoints
│
├── src/context/
│   └── AuthContext.tsx       ← Global auth state (replace login/logout triggers re-render)
│
├── app/
│   ├── login.tsx             ← Login screen (shown when not logged in)
│   ├── (tabs)/               ← Dashboard tabbed screens (shown when logged in)
│   └── _layout.tsx           ← Root navigation config
│
├── .env                      ← Your config (DON'T COMMIT)
├── .env.example              ← Template file
├── package.json              ← Dependencies list
└── README.md                 ← Quick reference
```

---

## 🎯 Next Steps

1. ✅ **Run the app** on your chosen platform
2. 📝 **Test login** with your backend
3. 🎨 **Port customer screens** from web version (gradually)
4. 📱 **Test on real device** before sharing with users
5. 🚀 **Deploy** to Google Play & App Store (when ready)

---

## 📚 Additional Resources

- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Expo Router Guide](https://docs.expo.dev/router/introduction/)
- [Android Studio Setup](https://developer.android.com/studio/install)
- [Xcode Documentation](https://developer.apple.com/xcode/)

---

**🎉 You're all set! Happy coding!**
