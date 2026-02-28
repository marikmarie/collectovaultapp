# 🚀 Quick Start - 5 Minutes

## Prerequisites
✅ Node.js installed? ([Get it](https://nodejs.org/))  
✅ Android Studio or Xcode installed?  
✅ USB cable ready?

---

## Run These Commands

### 1️⃣ Install dependencies
```bash
cd "D:\Cissy technologies\CollectoVault\collectovaultapp"
npm install
```

### 2️⃣ Configure API URL
```bash
cp .env.example .env
# Edit .env and add your API URL:
# EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3000
```
**💡 Tip:** Use your computer's IP address (find with `ipconfig`), not localhost

### 3️⃣ Start the app

#### On Android Emulator
```bash
npm run android
```

#### On iOS Simulator (macOS)
```bash
npm run ios
```

#### On Your Phone (Easiest - No Setup Needed!)
```bash
npm start
# Scan the QR code with your phone camera
```

---

## ✅ What You Should See

- Login screen loads with **"CollectoVault"** title
- Username input field is ready
- Sign In button responds to tap

---

## 🆘 If Something Goes Wrong

| Problem | Fix |
|---------|-----|
| "API fails to connect" | Replace `localhost` with your computer IP in `.env` |
| "Device not found" | Reconnect USB cable or restart emulator |
| "Port already in use" | `npm start -- --port 8090` |
| "Blank white screen" | `npm start -- --clear` then reload |

---

## 📖 Full Details

See **SETUP_GUIDE.md** for detailed instructions and troubleshooting.

---

## 🎯 What's Next?

1. Log in with a test account
2. Check console for errors
3. Port customer screens one by one
4. Test on real device before deployment

**Happy coding! 🎉**
