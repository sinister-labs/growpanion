import crypto from 'crypto';

interface TuyaCredentials {
  clientId: string;
  clientSecret: string;
}

interface TuyaAuthResponse {
  success: boolean;
  result?: {
    access_token: string;
    refresh_token: string;
    expire_time: number;
    uid?: string;
  };
  error?: string;
  message?: string;
}

interface SensorDataResponse {
  success: boolean;
  result?: any;
  error?: string;
  message?: string;
}

export class TuyaApiClient {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private accessTokenExpiry: number = 0;

  constructor(credentials: TuyaCredentials) {
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
  }

  /**
   * Helper method to determine the API base URL
   * @returns API base URL as string
   */
  private getApiBaseUrl(): string {
    // In the browser we use a relative path, on the server an absolute URL
    if (typeof window !== 'undefined') {
      // Browser environment
      return '';
    } else {
      // Node.js environment - use absolute URL
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    }
  }

  /**
   * Handles API errors consistently
   * @param error The error that occurred
   * @param defaultMessage Default message if no error message exists
   * @returns Error response as object
   */
  private handleApiError(error: unknown, defaultMessage = "Unknown error"): { success: false; message: string } {
    const errorMessage = error instanceof Error ? error.message : defaultMessage;
    return { success: false, message: errorMessage };
  }

  /**
   * Performs a connection test by attempting to get a token
   * @returns Connection test result
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const authResponse = await this.authenticate();
      
      if (authResponse.success && authResponse.result) {
        return { 
          success: true, 
          message: "Connection successful!" 
        };
      } else {
        return { 
          success: false, 
          message: authResponse.message || "Authentication failed."
        };
      }
    } catch (error) {
      return this.handleApiError(error, "Connection error");
    }
  }

  /**
   * Authenticates with the Tuya API and gets an access token via the local proxy
   * @returns Authentication response
   */
  private async authenticate(): Promise<TuyaAuthResponse> {
    try {
      const baseUrl = this.getApiBaseUrl();
      // Use of the local Next.js API proxy
      const url = `${baseUrl}/api/tuya/token?client_id=${this.clientId}&client_secret=${this.clientSecret}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        return {
          success: false,
          message: `HTTP Error: ${response.status} ${response.statusText}`
        };
      }
      
      const data = await response.json();
      
      if (data && data.success && data.result && data.result.access_token) {
        this.accessToken = data.result.access_token;
        this.accessTokenExpiry = Date.now() + (data.result.expire_time * 1000);
        return { success: true, result: data.result };
      } else {
        return {
          success: false,
          message: data.msg || "Unknown API error"
        };
      }
    } catch (error) {
      return this.handleApiError(error, "Unknown error during authentication");
    }
  }

  /**
   * Gets the data for a sensor based on its Tuya ID
   * @param tuyaId ID of the Tuya device
   * @returns Sensor data response
   */
  async getSensorData(tuyaId: string): Promise<SensorDataResponse> {
    try {
      // Ensure we have a valid token
      if (!this.accessToken || Date.now() >= this.accessTokenExpiry) {
        const authResponse = await this.authenticate();
        if (!authResponse.success || !authResponse.result?.access_token) {
          return { 
            success: false, 
            message: "Authentication failed."
          };
        }
      }

      const baseUrl = this.getApiBaseUrl();
      // Use of the local Next.js API proxy with credentials as query parameters
      const url = `${baseUrl}/api/tuya/sensor-data?deviceId=${tuyaId}&client_id=${this.clientId}&client_secret=${this.clientSecret}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.accessToken}`
        }
      });
      
      if (!response.ok) {
        return {
          success: false,
          message: `HTTP Error: ${response.status} ${response.statusText}`
        };
      }
      
      const data = await response.json();
      
      // Return the proper data structure
      return { 
        success: !!data.success, 
        result: data,
        message: data.msg || ''
      };
      
    } catch (error) {
      return this.handleApiError(error, "Error retrieving sensor data");
    }
  }
} 