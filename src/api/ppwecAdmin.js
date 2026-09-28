import apiClient from '@/api/client'

const BASE = '/ppwec'

export const ppwecAdminApi = {
  // Catalog (reuse learner endpoints — same shapes)
  listModules: () => apiClient.get(`${BASE}/modules`),
  getModule: (n) => apiClient.get(`${BASE}/modules/${n}`),

  // Single upserts (existing endpoints)
  upsertModule: (payload) => apiClient.post(`${BASE}/admin/modules`, payload),
  upsertScreen: (n, payload) => apiClient.post(`${BASE}/admin/modules/${n}/screens`, payload),
  upsertQuestion: (n, payload) => apiClient.post(`${BASE}/admin/modules/${n}/questions`, payload),

  // §X validation
  validate: (n) => apiClient.get(`${BASE}/admin/modules/${n}/validate`),

  // Bulk JSON export/import (§27)
  exportModule: async (n) => {
    const { data } = await apiClient.get(`${BASE}/admin/modules/${n}/export`)
    return data
  },
  importModule: (payload) => apiClient.post(`${BASE}/admin/modules/import`, payload),
  exportUrl: (n) => `${apiClient.defaults.baseURL}${BASE}/admin/modules/${n}/export`,

  // §Y gate
  gateStatus: (n) => apiClient.get(`${BASE}/admin/modules/${n}/gate`),
  signoff: (n, payload) => apiClient.post(`${BASE}/admin/modules/${n}/signoff`, payload),
  freeze: (n, frozen) => apiClient.post(`${BASE}/admin/modules/${n}/freeze`, { frozen }),

  // TTS export helper for narration production
  ttsExport: (n, format = 'json') => apiClient.post(`${BASE}/admin/modules/${n}/tts-export`, { format }),
}
