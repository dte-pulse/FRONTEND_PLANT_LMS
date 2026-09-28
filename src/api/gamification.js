import apiClient from '@/api/client'

export const gamificationApi = {
  // Coin popup: totals, this-month, global rank, breakdown, embedded streak
  wallet: () => apiClient.get('/gamification/wallet'),

  // Streak popup: current/longest streak + week strip (1=Mon..7=Sun)
  getStreak: () => apiClient.get('/gamification/streak'),

  // Monthly leaderboard (resets each calendar month)
  leaderboard: (params) => apiClient.get('/gamification/leaderboard', { params }),

  // Recent coin-earning events
  history: (limit = 30) => apiClient.get('/gamification/history', { params: { limit } }),
}
