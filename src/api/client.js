import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1',
  timeout: 15000,
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('pulse_lms_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('pulse_lms_token');
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

export const get = async (url, config = {}) => (await apiClient.get(url, config)).data;
export const post = async (url, data, config = {}) => (await apiClient.post(url, data, config)).data;
export const put = async (url, data, config = {}) => (await apiClient.put(url, data, config)).data;
export const patch = async (url, data, config = {}) => (await apiClient.patch(url, data, config)).data;
export const del = async (url, config = {}) => (await apiClient.delete(url, config)).data;

export default apiClient
