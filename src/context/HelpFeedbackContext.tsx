import React, { createContext, useContext, useState, useCallback } from 'react';

export type HubPage = 'main' | 'feedback' | 'rating' | 'chat' | 'faq';

interface HelpFeedbackContextType {
  // Hub Modal State
  showHelpHub: boolean;
  openHelpHub: (page?: HubPage) => void;
  closeHelpHub: () => void;
  currentPage: HubPage;
  setCurrentPage: (page: HubPage) => void;

  // Context Data for Forms
  contextData: {
    transactionId?: number;
    invoiceId?: string;
    feedbackType?: 'order' | 'service' | 'app' | 'general';
  };
  setContextData: (data: any) => void;
  clearContextData: () => void;

  // Unread Messages
  unreadCount: number;
  setUnreadCount: (count: number) => void;

  // Individual Modal Controls (for backwards compatibility)
  showFeedbackModal: boolean;
  openFeedbackModal: (type?: 'order' | 'service' | 'app' | 'general') => void;
  closeFeedbackModal: () => void;

  showRatingModal: boolean;
  ratingTransactionId: number | null;
  openRatingModal: (transactionId: number) => void;
  closeRatingModal: () => void;

  showChatModal: boolean;
  openChatModal: () => void;
  closeChatModal: () => void;
}

const HelpFeedbackContext = createContext<HelpFeedbackContextType | undefined>(undefined);

export function HelpFeedbackProvider({ children }: { children: React.ReactNode }) {
  // Hub Modal State
  const [showHelpHub, setShowHelpHub] = useState(false);
  const [currentPage, setCurrentPage] = useState<HubPage>('main');

  // Context Data
  const [contextData, setContextData] = useState({});

  // Unread Messages
  const [unreadCount, setUnreadCount] = useState(0);

  // Individual Modal States (for backwards compatibility)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTransactionId, setRatingTransactionId] = useState<number | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);

  const openHelpHub = useCallback((page: HubPage = 'main') => {
    setCurrentPage(page);
    setShowHelpHub(true);
  }, []);

  const closeHelpHub = useCallback(() => {
    setShowHelpHub(false);
    setTimeout(() => setCurrentPage('main'), 300); // Reset after closing animation
  }, []);

  const openFeedbackModal = useCallback((type: 'order' | 'service' | 'app' | 'general' = 'general') => {
    setContextData((prev) => ({ ...prev, feedbackType: type }));
    setShowFeedbackModal(true);
  }, []);

  const closeFeedbackModal = useCallback(() => {
    setShowFeedbackModal(false);
  }, []);

  const openRatingModal = useCallback((transactionId: number) => {
    setRatingTransactionId(transactionId);
    setContextData((prev) => ({ ...prev, transactionId }));
    setShowRatingModal(true);
  }, []);

  const closeRatingModal = useCallback(() => {
    setShowRatingModal(false);
    setRatingTransactionId(null);
  }, []);

  const openChatModal = useCallback(() => {
    setShowChatModal(true);
  }, []);

  const closeChatModal = useCallback(() => {
    setShowChatModal(false);
  }, []);

  const clearContextData = useCallback(() => {
    setContextData({});
  }, []);

  const value: HelpFeedbackContextType = {
    showHelpHub,
    openHelpHub,
    closeHelpHub,
    currentPage,
    setCurrentPage,
    contextData,
    setContextData,
    clearContextData,
    unreadCount,
    setUnreadCount,
    showFeedbackModal,
    openFeedbackModal,
    closeFeedbackModal,
    showRatingModal,
    ratingTransactionId,
    openRatingModal,
    closeRatingModal,
    showChatModal,
    openChatModal,
    closeChatModal,
  };

  return (
    <HelpFeedbackContext.Provider value={value}>
      {children}
    </HelpFeedbackContext.Provider>
  );
}

export function useHelpFeedback() {
  const context = useContext(HelpFeedbackContext);
  if (!context) {
    throw new Error('useHelpFeedback must be used within a HelpFeedbackProvider');
  }
  return context;
}
