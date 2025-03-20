import crypto from 'crypto';
import { apiRequest } from './apiClient';

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
  private baseUrl: string = 'https://openapi.tuyaeu.com';

  constructor(credentials: TuyaCredentials) {
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
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
   * Authenticates with the Tuya API and gets an access token
   * @returns Authentication response
   */
  private async authenticate(): Promise<TuyaAuthResponse> {
    try {

      const t = Date.now().toString();

      const contentHash = crypto.createHash('sha256').update('').digest('hex');

      const method = "GET";
      const signUrl = "/v1.0/token?grant_type=1";

      const stringToSign = [method, contentHash, "", signUrl].join("\n");
      const signStr = this.clientId + t + stringToSign;

      const sign = crypto.createHmac('sha256', this.clientSecret)
        .update(signStr, 'utf8')
        .digest('hex')
        .toUpperCase();

      const headers = {
        "client_id": this.clientId,
        "t": t,
        "sign": sign,
        "sign_method": "HMAC-SHA256",
        "Content-Type": "application/json"
      };

      const data = await apiRequest<any>({
        url: `${this.baseUrl}/v1.0/token?grant_type=1`,
        method: "GET",
        headers: headers
      });

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

      if (!this.accessToken) {
        return {
          success: false,
          message: "No valid access token available."
        };
      }

      const t = Date.now().toString();

      const contentHash = crypto.createHash('sha256').update('').digest('hex');

      const method = "GET";
      const signUrl = `/v2.0/cloud/thing/${tuyaId}/shadow/properties`;

      const stringToSign = [method, contentHash, "", signUrl].join("\n");
      const signStr = this.clientId + this.accessToken + t + stringToSign;

      const sign = crypto.createHmac('sha256', this.clientSecret)
        .update(signStr, 'utf8')
        .digest('hex')
        .toUpperCase();

      const data = await apiRequest<any>({
        url: `${this.baseUrl}${signUrl}`,
        method: "GET",
        headers: {
          "client_id": this.clientId,
          "access_token": this.accessToken,
          "t": t,
          "sign": sign,
          "sign_method": "HMAC-SHA256",
          "Content-Type": "application/json"
        }
      });

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