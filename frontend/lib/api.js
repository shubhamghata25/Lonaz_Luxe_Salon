"use client";
/**
 * FILE: frontend/lib/api.js
 *
 * CRITICAL FIX: Removed all explicit { "Content-Type": "multipart/form-data" } headers.
 * When you set this header manually, you OMIT the boundary parameter that multer requires
 * to parse the request body. This was causing "Upload failed" on ALL file uploads.
 * Axios automatically sets the correct Content-Type with boundary when passed a FormData object.
 */
import axios from "axios";

const api = axios.create({
  // /api/backend/* is rewritten by next.config.js → Render backend
  // Works in both local dev and production on Vercel — no env var needed
  baseURL: "/api/backend",
  timeout: 30000,
  headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ss_token");
    if (token) {
      // Check token not expired before sending
      try {
        const [,payload] = token.split(".");
        const { exp } = JSON.parse(atob(payload));
        if (exp * 1000 < Date.now()) {
          localStorage.removeItem("ss_token");
          localStorage.removeItem("ss_user");
          if (typeof window !== "undefined") window.location.href = "/login";
          return Promise.reject(new Error("Session expired"));
        }
      } catch {}
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
    delete config.headers.common?.["Content-Type"];
  }
  return config;
});

// Auto-logout on 401 responses
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      try {
        const path = window.location.pathname;
        if (path !== "/login" && path !== "/") {
          localStorage.removeItem("ss_token");
          localStorage.removeItem("ss_user");
          window.location.href = "/login?expired=1";
        }
      } catch {}
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  register: (d)  => api.post("/auth/register", d),
  login:    (d)  => api.post("/auth/login", d),
  me:       ()   => api.get("/auth/me"),
};

export const categoriesAPI = {
  list:         ()      => api.get("/categories"),
  withServices: (id)    => api.get(`/categories/${id}/services`),
  create:       (d)     => api.post("/categories", d),
  update:       (id, d) => api.patch(`/categories/${id}`, d),
  delete:       (id)    => api.delete(`/categories/${id}`),
};

export const servicesAPI = {
  list:   (params) => api.get("/services", { params }),
  get:    (id)     => api.get(`/services/${id}`),
  create: (d)      => api.post("/services", d),
  update: (id, d)  => api.patch(`/services/${id}`, d),
  delete: (id)     => api.delete(`/services/${id}`),
};

export const subServicesAPI = {
  byService: (sid)   => api.get(`/sub-services?service_id=${sid}`),
  all:       ()      => api.get("/sub-services/all"),
  create:    (d)     => api.post("/sub-services", d),
  update:    (id, d) => api.patch(`/sub-services/${id}`, d),
  delete:    (id)    => api.delete(`/sub-services/${id}`),
};

export const bookingsAPI = {
  availability:   (date, sid) => api.get(`/bookings/availability?date=${date}&service_id=${sid}`),
  create:         (d)         => api.post("/bookings", d),
  walkin:         (d)         => api.post("/bookings/walkin", d),
  list:           ()          => api.get("/bookings"),
  get:            (id)        => api.get(`/bookings/${id}`),
  updateStatus:   (id, s)     => api.patch(`/bookings/${id}/status`, { status: s }),
  cancel:         (id)        => api.patch(`/bookings/${id}/cancel`),
  confirmPayment: (id, pid)   => api.patch(`/bookings/${id}/confirm-payment`, { payment_id: pid }),
  delete:         (id)        => api.delete(`/bookings/${id}`),
};

export const paymentsAPI = {
  createRazorpayOrder: (bid)    => api.post("/payments/razorpay/order", { booking_id: bid }),
  verifyRazorpay:      (d)      => api.post("/payments/razorpay/verify", d),
  createPaytmOrder:    (bid)    => api.post("/payments/paytm/order", { booking_id: bid }),
  uploadUpiScreenshot: (fd)     => api.post("/payments/upi/upload", fd),  // FormData — no Content-Type override
  pendingUpi:          ()       => api.get("/payments/pending"),
  verifyManual:        (id, d)  => api.patch(`/payments/${id}/verify`, d),
  list:                ()       => api.get("/payments"),
};

export const coursesAPI = {
  list:   ()        => api.get("/courses"),
  get:    (id)      => api.get(`/courses/${id}`),
  access: (id)      => api.get(`/courses/${id}/access`),
  enroll: (id, pid) => api.post(`/courses/${id}/enroll`, { payment_id: pid }),
  create: (d)       => api.post("/courses", d),
  update: (id, d)   => api.patch(`/courses/${id}`, d),
  delete: (id)      => api.delete(`/courses/${id}`),
};

export const careersAPI = {
  jobs:              ()       => api.get("/careers/jobs"),
  createJob:         (d)      => api.post("/careers/jobs", d),
  updateJob:         (id, d)  => api.patch(`/careers/jobs/${id}`, d),
  deleteJob:         (id)     => api.delete(`/careers/jobs/${id}`),
  apply:             (fd)     => api.post("/careers/apply", fd),  // FormData — no Content-Type override
  applications:      ()       => api.get("/careers/applications"),
  updateApplication: (id, s)  => api.patch(`/careers/applications/${id}`, { status: s }),
};

export const offersAPI = {
  list:   ()         => api.get("/offers"),
  all:    ()         => api.get("/offers/all"),
  create: (fd)       => api.post("/offers", fd),          // FormData
  update: (id, fd)   => api.patch(`/offers/${id}`, fd),   // FormData
  delete: (id)       => api.delete(`/offers/${id}`),
};

export const videosAPI = {
  list:   ()         => api.get("/videos"),
  create: (d)        => api.post("/videos", d),
  update: (id, d)    => api.patch(`/videos/${id}`, d),
  delete: (id)       => api.delete(`/videos/${id}`),
};

export const settingsAPI = {
  get:            ()          => api.get("/settings"),
  update:         (d)         => api.patch("/settings", d),
  uploadLogo:     (fd)        => api.post("/settings/logo", fd),         // FormData
  getHeroMedia:   ()          => api.get("/settings/hero-media"),
  uploadHeroMedia:(fd, type)  => api.post(`/settings/hero-media?type=${type}`, fd), // FormData
  clearHeroMedia: ()          => api.delete("/settings/hero-media"),
};

export const uploadAPI = {
  image: (fd, folder = "lonaz-luxe/general") => api.post(`/upload/image?folder=${folder}`, fd),  // FormData
  video: (fd, folder = "lonaz-luxe/videos")  => api.post(`/upload/video?folder=${folder}`, fd),  // FormData
};

export const contactsAPI = {
  send:     (d)  => api.post("/contacts", d),
  list:     ()   => api.get("/contacts"),
  markRead: (id) => api.patch(`/contacts/${id}/read`),
};

export const adminAPI = {
  dashboard:     () => api.get("/admin/dashboard"),
  users:         () => api.get("/admin/users"),
  todayBookings: () => api.get("/admin/bookings/today"),
};

export const usersAPI = {
  myBookings:    () => api.get("/users/my-bookings"),
  myCourses:     () => api.get("/users/my-courses"),
  updateProfile: (d) => api.patch("/users/profile", d),
};
