import apiClient from '@/api/client'

export const ppwecApi = {
  // Catalog & player
  listModules: () => apiClient.get('/ppwec/modules'),
  getModule: (n) => apiClient.get(`/ppwec/modules/${n}`),
  getState: (n) => apiClient.get(`/ppwec/modules/${n}/state`),
  completeScreen: (n, payload) => apiClient.post(`/ppwec/modules/${n}/screens/complete`, payload),

  // Assessment
  startAssessment: (n) => apiClient.post(`/ppwec/modules/${n}/assessment/start`),
  submitAssessment: (n, payload) => apiClient.post(`/ppwec/modules/${n}/assessment/submit`, payload),

  // Passport / overview / points
  getPassport: () => apiClient.get('/ppwec/passport'),
  getOverview: () => apiClient.get('/ppwec/overview'),
  getPoints: () => apiClient.get('/ppwec/points'),

  // 7-Day Challenge
  startChallenge: (n) => apiClient.post(`/ppwec/modules/${n}/challenge/start`),
  tickChallenge: (n, payload) => apiClient.post(`/ppwec/modules/${n}/challenge/tick`, payload),

  // Certificate
  certificateUrl: `${apiClient.defaults.baseURL}/ppwec/certificate/html`,

  // Media (§7/§23): exchange JWT for a short-lived signed playback URL that
  // <audio>/<video> elements can use without Authorization headers.
  getMediaSrc: async (moduleNumber, screenNumber, kind = 'audio') => {
    const { data } = await apiClient.post(
      `/ppwec/modules/${moduleNumber}/screens/${screenNumber}/media-src?kind=${kind}`
    )
    return data.src.startsWith('http') ? data.src : `${apiClient.defaults.baseURL}${data.src}`
  },

  // Admin/HR reporting
  orgReport: () => apiClient.get('/ppwec/reports/organization'),
  deptReport: () => apiClient.get('/ppwec/reports/departments'),
  exportCsvUrl: `${apiClient.defaults.baseURL}/ppwec/reports/export`,
}

export default ppwecApi
