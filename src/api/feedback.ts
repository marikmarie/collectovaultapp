import axios from "axios";

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:4000";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

api.interceptors.response.use(
  (response) => {
    console.log("API response:", {
      url: response.config.url,
      method: response.config.method,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    if (error.response) {
      console.error("API response error:", {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response.status,
        data: error.response.data,
      });
    } else {
      console.error("API request error:", error.message);
    }
    return Promise.reject(error);
  },
);

// ========== RATING ENDPOINTS ==========

export interface RatingData {
  clientId: number;
  transactionId: number;
  orderRating: number;
  paymentRating: number;
  serviceRating: number;
  overallRating: number;
  comment?: string;
}

export const createRating = async (data: RatingData) => {
  const response = await api.post("/ratings", data);
  return response.data;
};

export const getRatingByTransaction = async (transactionId: number) => {
  try {
    const response = await api.get(`/ratings/transaction/${transactionId}`);
    return response.data;
  } catch (error) {
    return null;
  }
};

export const getCustomerAverageRatings = async (clientId: number) => {
  const response = await api.get(`/ratings/customer/${clientId}/average`);
  return response.data;
};

// ========== FEEDBACK ENDPOINTS ==========

export interface FeedbackData {
  clientId: number;
  feedbackType: "order" | "service" | "app" | "general";
  title: string;
  message: string;
  attachments?: string[];
}

export const createFeedback = async (data: FeedbackData) => {
  const response = await api.post("/feedback", data);
  return response.data;
};

export const getCustomerFeedback = async (
  clientId: number,
  limit = 20,
  offset = 0,
) => {
  const response = await api.get(
    `/feedback/customer/${clientId}?limit=${limit}&offset=${offset}`,
  );
  return response.data;
};

// ========== CHAT ENDPOINTS ==========

export interface ChatMessageData {
  clientId: number;
  message: string;
  attachments?: string[];
}

export const sendChatMessage = async (data: ChatMessageData) => {
  const response = await api.post("/chat", {
    ...data,
    senderType: "customer",
  });
  return response.data;
};

export const getConversation = async (
  clientId: number,
  limit = 50,
  offset = 0,
) => {
  const response = await api.get(
    `/chat/customer/${clientId}?limit=${limit}&offset=${offset}`,
  );
  return response.data;
};

export const getUnreadMessageCount = async (clientId: number) => {
  const response = await api.get(`/chat/customer/${clientId}/unread`);
  return response.data.unreadCount;
};

export const markChatMessageAsRead = async (messageId: number) => {
  const response = await api.patch(`/chat/${messageId}/read`);
  return response.data;
};

// ========== CONTACT ENDPOINTS ==========

export const setUserWhatsApp = async (
  clientId: number,
  whatsappNumber: string,
) => {
  const response = await api.post("/contacts/whatsapp/user", {
    clientId,
    whatsappNumber,
  });
  return response.data;
};

export const getUserWhatsAppContact = async (clientId: number) => {
  try {
    const response = await api.get(`/contacts/whatsapp/user/${clientId}`);
    return response.data;
  } catch (error) {
    return null;
  }
};

export const getBusinessWhatsAppUrl = async () => {
  try {
    const response = await api.get("/contacts/whatsapp/business/url");
    return response.data.whatsappUrl;
  } catch (error) {
    return null;
  }
};

export const deleteUserWhatsAppContact = async (clientId: number) => {
  const response = await api.delete(`/contacts/whatsapp/user/${clientId}`);
  return response.data;
};
