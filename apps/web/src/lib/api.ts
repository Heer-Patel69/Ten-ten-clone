const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // Try refresh if token expired
      if (response.status === 401 && data.error === 'Token expired') {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry with new token
          headers['Authorization'] = `Bearer ${this.getToken()}`;
          const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
          });
          return retryResponse.json();
        }
      }
      throw new Error(data.error || 'API request failed');
    }

    return data;
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  // Auth
  async register(displayName: string, password: string) {
    return this.request<any>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ displayName, password }),
    });
  }

  async login(userCode: string, password: string) {
    return this.request<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userCode, password }),
    });
  }

  async getMe() {
    return this.request<any>('/api/auth/me');
  }

  async updateProfile(data: { displayName?: string }) {
    return this.request<any>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async savePushSubscription(subscription: any) {
    return this.request<any>('/api/auth/push-subscription', {
      method: 'PUT',
      body: JSON.stringify({ subscription }),
    });
  }

  // Friends
  async getFriends() {
    return this.request<any>('/api/friends');
  }

  async getFriendRequests() {
    return this.request<any>('/api/friends/requests');
  }

  async getSentRequests() {
    return this.request<any>('/api/friends/sent');
  }

  async sendFriendRequest(userCode: string) {
    return this.request<any>('/api/friends/request', {
      method: 'POST',
      body: JSON.stringify({ userCode }),
    });
  }

  async acceptFriendRequest(friendshipId: string) {
    return this.request<any>(`/api/friends/accept/${friendshipId}`, {
      method: 'PUT',
    });
  }

  async rejectFriendRequest(friendshipId: string) {
    return this.request<any>(`/api/friends/reject/${friendshipId}`, {
      method: 'PUT',
    });
  }

  async removeFriend(friendshipId: string) {
    return this.request<any>(`/api/friends/${friendshipId}`, {
      method: 'DELETE',
    });
  }

  // Admin
  async getAdminStats() {
    return this.request<any>('/api/admin/stats');
  }

  async getAdminUsers(page = 1, search = '') {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set('search', search);
    return this.request<any>(`/api/admin/users?${params}`);
  }

  async deleteUser(userId: string) {
    return this.request<any>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async updateUserRole(userId: string, role: string) {
    return this.request<any>(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async getReports(status?: string) {
    const params = status ? `?status=${status}` : '';
    return this.request<any>(`/api/admin/reports${params}`);
  }

  async updateReport(reportId: string, data: { status: string; resolution?: string }) {
    return this.request<any>(`/api/admin/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
