# Architecture & Data Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RootLayout (_layout.tsx)                │
│                   ┌─────────────────────┐                  │
│                   │ AuthProvider        │                  │
│                   │ ↓                   │                  │
│                   │ HelpFeedbackProvider│ ← NEW!           │
│                   │ ↓                   │                  │
│                   │ App Content         │                  │
│                   └─────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────────────────────────┐
        │       TabLayout ((tabs)/_layout.tsx)    │
        │                                          │
        │  ┌──────────────────────────────────┐  │
        │  │ Tabs (Home/Statement/Serv/Help) │  │
        │  └──────────────────────────────────┘  │
        │                                          │
        │  ┌──────────────────────────────────┐  │
        │  │ FloatingHelpButton ← NEW!        │  │ ← Visible all screens
        │  │ (position: absolute, bottom)    │  │
        │  └──────────────────────────────────┘  │
        │                                          │
        │  ┌──────────────────────────────────┐  │
        │  │ HelpHubModal ← NEW!              │  │ ← Global modal
        │  │ (attached to context)            │  │
        │  └──────────────────────────────────┘  │
        └─────────────────────────────────────────┘
                      ↓
    ┌─────────────────────────────────────────────┐
    │        Individual Screen Components          │
    │                                              │
    │  ┌────────────────────────────────────┐    │
    │  │ StatementScreen (statement.tsx)    │    │
    │  │                                    │    │
    │  │ - Payment Modal                    │    │
    │  │ - PostPaymentFeedback ← NEW!      │    │ ← Auto-trigger
    │  │   (After payment success)          │    │
    │  │                                    │    │
    │  │ - Payment → Success → Show FAB     │    │
    │  │                 → Show Feedback   │    │
    │  └────────────────────────────────────┘    │
    │                                              │
    │  ┌────────────────────────────────────┐    │
    │  │ HomeScreen                         │    │
    │  │ ServiceScreen                      │    │
    │  │ HelpScreen                         │    │
    │  │ (FAB + HelpHub accessible from all)│    │
    │  └────────────────────────────────────┘    │
    └─────────────────────────────────────────────┘
```

---

## Data Flow: Feedback After Payment

```
┌─────────────────────────────────────────────────────────┐
│ Invoice Payment Process                                 │
└─────────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────────────────────┐
        │ Payment Modal (statement.tsx) │
        │ handlePayInvoice()            │
        └───────────────────────────────┘
                        ↓
        ┌───────────────────────────────┐
        │ API: invoiceService.payInvoice│
        │ setPaymentResult()            │
        └───────────────────────────────┘
                        ↓
        ┌───────────────────────────────┐
        │ queryTxStatus() → Polling     │
        │ lastQueriedStatus = 'pending' │
        └───────────────────────────────┘
                        ↓
        ┌───────────────────────────────┐
        │ Payment Confirmed             │
        │ lastQueriedStatus = 'success' │
        └───────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────┐
│ useEffect Hook (statement.tsx)               │
│ Watches: lastQueriedStatus === 'success'     │
└──────────────────────────────────────────────┘
                        ↓
        ┌───────────────────────────────┐
        │ 3-Second Delay               │
        │ setTimeout()                  │
        └───────────────────────────────┘
                        ↓
        ┌─────────────────────────────────────┐
        │ PostPaymentFeedback Shows           │
        │ setShowPostPaymentFeedback(true)    │
        │ setLastPaymentData({ invoiceId })   │
        └─────────────────────────────────────┘
                        ↓
        ┌─────────────────────────────────────────┐
        │ User Selects Action                     │
        ├─────────────────────────────────────────┤
        │                                         │
        │  Option 1: Share Feedback              │
        │  ├─ onOpenFeedback()                   │
        │  ├─ setContextData({ invoiceId })      │
        │  └─ openFeedbackModal('order')         │
        │      (FeedbackModal appears)           │
        │                                         │
        │  Option 2: Rate Experience             │
        │  ├─ onOpenRating()                     │
        │  ├─ setContextData({ invoiceId })      │
        │  └─ openFeedbackModal('service')       │
        │      (FeedbackModal appears)           │
        │                                         │
        │  Option 3: Maybe Later                 │
        │  └─ onClose()                          │
        │     (Modal dismissed)                  │
        │                                         │
        └─────────────────────────────────────────┘
```

---

## Data Flow: Opening Help Hub

```
┌──────────────────────────────────────────────┐
│ User on Any Screen (Home/Statement/etc.)    │
│ Sees Floating Help Button (FAB)              │
└──────────────────────────────────────────────┘
                        ↓
        ┌────────────────────────────┐
        │ Tap FloatingHelpButton     │
        │ handlePress()              │
        │ openHelpHub('main')        │
        └────────────────────────────┘
                        ↓
    ┌───────────────────────────────────────────┐
    │ HelpFeedbackContext Updates               │
    │ - showHelpHub = true                      │
    │ - currentPage = 'main'                    │
    └───────────────────────────────────────────┘
                        ↓
        ┌──────────────────────────────┐
        │ HelpHubModal Renders         │
        │ mainContent (4 Options)      │
        ├──────────────────────────────┤
        │                              │
        │ [💬] Send Feedback           │
        │ ├─ onPress: handleMainActions│
        │ └─ setCurrentPage('feedback')│
        │                              │
        │ [⭐] Rate Transaction        │
        │ ├─ onPress: handleMainActions│
        │ └─ setCurrentPage('rating')  │
        │                              │
        │ [💬] Live Chat               │
        │ ├─ onPress: handleMainActions│
        │ ├─ Badge: unreadCount > 0   │
        │ └─ setCurrentPage('chat')    │
        │                              │
        │ [❓] FAQ                     │
        │ ├─ onPress: handleMainActions│
        │ └─ setCurrentPage('faq')     │
        │                              │
        └──────────────────────────────┘
                        ↓
    ┌───────────────────────────────────────────┐
    │ User Selects an Option                    │
    ├───────────────────────────────────────────┤
    │                                           │
    │ Selection 1: Feedback                     │
    │ └─ setShowChildModal(true)                │
    │    └─ Render FeedbackModal (existing)    │
    │       └─ Receives customerId, type      │
    │                                           │
    │ Selection 2: Rating                       │
    │ └─ setShowChildModal(true)                │
    │    └─ Render RatingModal (existing)      │
    │       └─ Needs transactionId from context│
    │                                           │
    │ Selection 3: Chat                         │
    │ └─ setShowChildModal(true)                │
    │    └─ Render LiveChatModal (existing)    │
    │       └─ Loads conversation              │
    │                                           │
    │ Selection 4: FAQ                          │
    │ └─ setCurrentPage('faq')                  │
    │    └─ HelpHubModal renders FAQ content   │
    │                                           │
    └───────────────────────────────────────────┘
```

---

## Context Data Flow

```
┌─────────────────────────────────────────────────┐
│         HelpFeedbackContext (Global)            │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │ State Variables                         │  │
│  ├─────────────────────────────────────────┤  │
│  │ showHelpHub: boolean                    │  │
│  │ currentPage: HubPage                    │  │
│  │ contextData: {                          │  │
│  │   transactionId?: number                │  │
│  │   invoiceId?: string                    │  │
│  │   feedbackType?: string                 │  │
│  │ }                                       │  │
│  │ unreadCount: number                     │  │
│  │ Individual modal states (4 modals)      │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │ Actions                                 │  │
│  ├─────────────────────────────────────────┤  │
│  │ openHelpHub(page)                       │  │
│  │ closeHelpHub()                          │  │
│  │ setContextData(data)                    │  │
│  │ clearContextData()                      │  │
│  │ setUnreadCount(count)                   │  │
│  │ openFeedbackModal(type)                 │  │
│  │ openRatingModal(txId)                   │  │
│  │ openChatModal()                         │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
         ↓ Consumed by ↓
    ┌────────────────────────┐
    │ All Components via     │
    │ useHelpFeedback()      │
    │                        │
    │ - HelpHubModal         │
    │ - FloatingHelpButton   │
    │ - PostPaymentFeedback  │
    │ - Statement Screen     │
    │ - Any Other Screen     │
    └────────────────────────┘
```

---

## Component Hierarchy

```
App (Root)
│
├─ HelpFeedbackProvider (Context)
│  │
│  ├─ AuthProvider
│  │  │
│  │  └─ RootLayoutContent
│  │     │
│  │     ├─ TabLayout
│  │     │  │
│  │     │  ├─ TabBar
│  │     │  │  ├─ Home Tab
│  │     │  │  ├─ Statement Tab
│  │     │  │  ├─ Services Tab
│  │     │  │  └─ Help Tab
│  │     │  │
│  │     │  ├─ FloatingHelpButton ← NEW
│  │     │  │  └─ TouchableOpacity
│  │     │  │     └─ Feather Icon
│  │     │  │
│  │     │  └─ HelpHubModal ← NEW
│  │     │     ├─ Modal
│  │     │     ├─ KeyboardAvoidingView
│  │     │     │
│  │     │     └─ Content (conditional render)
│  │     │        ├─ Main Page
│  │     │        │  └─ 4 Option Cards
│  │     │        │     ├─ Feedback
│  │     │        │     ├─ Rating
│  │     │        │     ├─ Chat
│  │     │        │     └─ FAQ
│  │     │        │
│  │     │        ├─ FAQ Page
│  │     │        │  └─ FAQ Items
│  │     │        │
│  │     │        └─ Child Modals (rendered conditionally)
│  │     │           ├─ FeedbackModal (existing)
│  │     │           ├─ RatingModal (existing)
│  │     │           └─ LiveChatModal (existing)
│  │     │
│  │     ├─ Home Screen
│  │     │  └─ (Has access to HelpHub)
│  │     │
│  │     ├─ Statement Screen
│  │     │  ├─ Payment Modal
│  │     │  ├─ PostPaymentFeedback ← NEW
│  │     │  │  └─ Two-step flow
│  │     │  └─ (Triggers feedback after success)
│  │     │
│  │     ├─ Services Screen
│  │     │  └─ (Has access to HelpHub)
│  │     │
│  │     └─ Help Screen
│  │        └─ (Has access to HelpHub)
│  │
│  └─ Login Screen
│
└─ End
```

---

## Component Communication Pattern

```
FloatingHelpButton (Component)
        ↓
    click event
        ↓
    openHelpHub('main')  ← calls context action
        ↓
    HelpFeedbackContext (updates state)
        ↓
    useHelpFeedback() hook ← all subscribers notified
        ↓
    HelpHubModal (re-renders with new props)
        ↓
    Displays Help Options
        ↓
    User Selects Option
        ↓
    handleMainActions() ← event handler
        ↓
    setCurrentPage('feedback')
    setShowChildModal(true)
        ↓
    HelpHubModal (re-renders)
        ↓
    Render FeedbackModal (child component)
        ↓
    Child modal gets data from context ← useHelpFeedback()
```

---

## File Dependencies

```
app/_layout.tsx
  ├─ imports: HelpFeedbackProvider
  └─ wraps: App

app/(tabs)/_layout.tsx
  ├─ imports: HelpHubModal, FloatingHelpButton
  └─ renders: Both globally

app/(tabs)/statement.tsx
  ├─ imports: PostPaymentFeedback, useHelpFeedback
  ├─ uses: openFeedbackModal, setContextData
  ├─ renders: PostPaymentFeedback (conditional)
  └─ triggers: feedback after payment success

components/HelpHubModal.tsx
  ├─ imports: useHelpFeedback, useAuth
  ├─ imports: FeedbackModal, RatingModal, LiveChatModal
  └─ renders: Child modals conditionally

components/FloatingHelpButton.tsx
  ├─ imports: useHelpFeedback
  └─ calls: openHelpHub()

components/PostPaymentFeedback.tsx
  └─ standalone (no context imports)

src/context/HelpFeedbackContext.tsx
  ├─ exports: HelpFeedbackProvider, useHelpFeedback
  └─ no imports from components
```

---

## State Management Timeline

```
Timeline: Invoice Payment → Feedback

T=0s
├─ User taps "Pay Invoice"
├─ paymentModalVisible = true
└─ Payment form shown

T=2s
├─ User confirms payment
├─ handlePayInvoice() called
└─ API call sent

T=3s
├─ API responds with transactionId
├─ setPaymentResult()
├─ queryTxStatus() starts polling
└─ Processing indicator shown

T=5-10s
├─ Payment status: pending
└─ Keep polling

T=12s (eventually)
├─ Payment status: success
├─ lastQueriedStatus = 'success'
├─ fetchTransactions() called
└─ Polling stops

T=15s (3-second delay from success)
├─ useEffect triggers
├─ setLastPaymentData()
├─ setShowPostPaymentFeedback(true)
└─ PostPaymentFeedback modal shows

T=16-20s
├─ User selects action
├─ setContextData()
├─ openFeedbackModal()
└─ FeedbackModal opens

T=21s+
├─ User submits feedback/rating
├─ Data sent to API
└─ Success confirmation shown
```

---

This architecture ensures:
✅ Separation of concerns
✅ Reusable components
✅ Centralized state
✅ Clear data flow
✅ Easy to extend
✅ Proper context isolation
