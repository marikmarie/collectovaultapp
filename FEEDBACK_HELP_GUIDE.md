# Modern Feedback & Help Module - Implementation Guide

## Overview
A comprehensive, modern feedback and help system integrated across the CollectoVault app. Users can access help, submit feedback, rate transactions, and chat with support from any screen.

---

## Components Created

### 1. **HelpFeedbackContext** (`src/context/HelpFeedbackContext.tsx`)
Global state management for all feedback and help operations.

**Features:**
- Centralized modal controls (Feedback, Rating, Chat, FAQ)
- Context data sharing between components
- Unread message counter
- Backward compatibility with existing modals

**Usage:**
```tsx
import { useHelpFeedback } from '@/src/context/HelpFeedbackContext';

const { openHelpHub, openFeedbackModal, openRatingModal, unreadCount } = useHelpFeedback();
```

### 2. **HelpHubModal** (`components/HelpHubModal.tsx`)
Central hub providing access to all help features with multiple pages:
- **Main Page**: Quick access to Feedback, Rating, Chat, FAQ
- **FAQ Page**: Built-in FAQ with searchable content
- Integrated child modals for each action

**Features:**
- Beautiful card-based UI
- Unread message badges
- Smooth page transitions
- Context-aware suggestions

### 3. **FloatingHelpButton** (`components/FloatingHelpButton.tsx`)
Persistent floating action button (FAB) for help access.

**Features:**
- Visible on all tab screens (bottom-right)
- Unread message pulse animation
- Badge showing unread count
- Easy one-tap access

### 4. **PostPaymentFeedback** (`components/PostPaymentFeedback.tsx`)
Automatic feedback prompt after successful invoice payment.

**Features:**
- Two-step flow: Confirmation → Options
- Quick access to feedback and rating
- "Maybe Later" option to dismiss
- Non-intrusive timing (3-second delay)

---

## Integration Points

### 1. **Root Layout** (`app/_layout.tsx`)
✅ HelpFeedbackProvider wraps entire app

### 2. **Tab Layout** (`app/(tabs)/_layout.tsx`)
✅ HelpHubModal and FloatingHelpButton added globally
- Accessible from all tabs (Home, Statement, Services, Help)

### 3. **Statement/Invoice Payment** (`app/(tabs)/statement.tsx`)
✅ Post-payment feedback trigger
✅ Integration with invoice payment flow
- Shows after successful payment
- Links to feedback and rating

---

## Usage Guide

### For Users

#### Access Help Hub
1. Tap the **pink Help button** (bottom-right) on any screen
2. Choose from:
   - **Send Feedback** - Share thoughts about the app
   - **Rate Transaction** - Rate your payment experience
   - **Live Chat** - Talk to support team
   - **FAQ** - Find quick answers

#### After Payment
1. After successful invoice payment, a feedback prompt appears
2. Choose to:
   - **Share Feedback** - Tell us about your payment experience
   - **Rate** - Rate order, payment, and service
   - **Maybe Later** - Dismiss for now

#### Live Chat
- Tap Help → Live Chat
- View unread messages (shows badge on Help button)
- Messages persisted with support team

---

## For Developers

### Opening Help Hub Programmatically
```tsx
import { useHelpFeedback } from '@/src/context/HelpFeedbackContext';

function MyScreen() {
  const { openHelpHub } = useHelpFeedback();

  return (
    <TouchableOpacity onPress={() => openHelpHub('main')}>
      <Text>Get Help</Text>
    </TouchableOpacity>
  );
}
```

### Opening Specific Modals
```tsx
const { openFeedbackModal, openRatingModal, openChatModal } = useHelpFeedback();

// Open feedback with type
openFeedbackModal('order'); // 'order' | 'service' | 'app' | 'general'

// Open rating for a transaction
openRatingModal(transactionId);

// Open live chat
openChatModal();
```

### Setting Context Data
```tsx
const { setContextData, openHelpHub } = useHelpFeedback();

// Set data before opening hub
setContextData({ 
  transactionId: 123,
  invoiceId: 'INV001',
  feedbackType: 'service'
});

openHelpHub('feedback');
```

### Tracking Unread Messages
```tsx
const { unreadCount, setUnreadCount } = useHelpFeedback();

// Update unread count when loading messages
useEffect(() => {
  loadMessages().then(messages => {
    const unreadCount = messages.filter(m => !m.isRead).length;
    setUnreadCount(unreadCount);
  });
}, []);
```

---

## Features by Screen

### Home Screen
- Floating Help button visible
- Quick access to FAQ, feedback, chat

### Statement/Invoice Screen
- Floating Help button
- **Post-payment feedback trigger** ✨
- Rate transaction option
- Direct link to help for invoice questions

### Services Screen
- Floating Help button
- General feedback for service issues
- Live chat for support

### Help Screen
- Already existing
- Now integrated with Help Hub
- Option to open any modal from here

---

## FAQ Integration

Built-in FAQ questions cover:
- How to make a payment?
- Using loyalty points for payments
- Payment processing time
- Failed payment troubleshooting
- How to earn loyalty points

**To add more FAQs:**
Edit the FAQ array in `HelpHubModal.tsx` (around line 150)

---

## Customization Guide

### Change Help Button Position
Edit `FloatingHelpButton.tsx`:
```tsx
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,  // ← Change this value
    right: 20,
  },
  ...
});
```

### Change Help Button Color
Edit `FloatingHelpButton.tsx`:
```tsx
fab: {
  backgroundColor: '#d81b60', // ← Change color
  ...
}
```

### Customize Help Hub Layout
Edit `HelpHubModal.tsx`:
- Modify `optionsGrid` layout in `mainContent`
- Add/remove options with `optionCard` components
- Update icons using Feather icons

### Update FAQ Content
In `HelpHubModal.tsx`, update the FAQ array:
```tsx
{
  q: 'Your Question?',
  a: 'Your Answer.',
}
```

---

## Data Flow

```
User opens Help Button
        ↓
HelpHubModal (Main Page)
    ├── Select Feedback → FeedbackModal
    ├── Select Rating → RatingModal (if transaction ID in context)
    ├── Select Chat → LiveChatModal
    └── Select FAQ → FAQ Page

After Invoice Payment
        ↓
Payment Succeeds
        ↓
PostPaymentFeedback Shows
    ├── User selects Feedback → Sets context + opens FeedbackModal
    └── User selects Rating → Sets context + opens FeedbackModal

All data synced through HelpFeedbackContext
```

---

## API Endpoints Used

The system leverages existing endpoints:

1. **Feedback**: `POST /feedback`
2. **Rating**: `POST /ratings`
3. **Chat**: `POST /chat`, `GET /chat/customer/:customerId`

See `src/api/feedback.ts` for full API integration.

---

## Future Enhancements

Potential additions:
1. Search within FAQ
2. Categorized help articles
3. Video tutorials
4. In-app notifications for responses
5. Feedback history view
6. Analytics dashboard
7. AI-powered chatbot
8. Push notifications for new messages
9. Help articles based on user actions
10. Multi-language support

---

## Testing Checklist

- [ ] Help button visible on all tabs
- [ ] Help Hub opens without errors
- [ ] Can submit feedback successfully
- [ ] Can rate transaction
- [ ] Live chat messages send/receive
- [ ] FAQ displays correctly
- [ ] Post-payment feedback triggers after successful payment
- [ ] Unread message badge updates
- [ ] All modals close properly
- [ ] No console errors
- [ ] Keyboard behavior smooth on all modals
- [ ] Context data persists correctly

---

## Troubleshooting

### Help Button Not Showing
- Check `FloatingHelpButton` is added to `(tabs)/_layout.tsx`
- Verify `HelpFeedbackProvider` wraps the app in `app/_layout.tsx`

### Modals Not Opening
- Ensure `useHelpFeedback` hook is called in correct component
- Check console for context errors
- Verify user is authenticated

### Post-Payment Not Triggering
- Check payment status becomes 'success'
- Verify `lastQueriedStatus` state updates
- Check `showPostPaymentFeedback` state

### Unread Count Not Updating
- Ensure `setUnreadCount` called after fetching messages
- Check `LiveChatModal` updates count when loading conversations

---

## File Structure

```
collectovaultapp/
├── src/context/
│   └── HelpFeedbackContext.tsx     (Global state)
├── components/
│   ├── HelpHubModal.tsx            (Main hub)
│   ├── FloatingHelpButton.tsx       (FAB)
│   ├── PostPaymentFeedback.tsx      (Payment trigger)
│   ├── FeedbackModal.tsx            (Existing - now integrated)
│   ├── RatingModal.tsx              (Existing - now integrated)
│   └── LiveChatModal.tsx            (Existing - now integrated)
└── app/
    ├── _layout.tsx                  (Provider setup)
    └── (tabs)/
        ├── _layout.tsx              (Modal + FAB added)
        └── statement.tsx            (Payment integration)
```

---

## Support

For issues or questions:
1. Check this guide first
2. Review component comments in code
3. Check browser console for errors
4. Verify all files are created
5. Clear app cache and rebuild

---

**Last Updated**: May 10, 2026
**Status**: ✅ Fully Implemented and Integrated
