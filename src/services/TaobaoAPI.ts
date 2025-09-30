import axios, { type AxiosResponse } from "axios";
import crypto from "crypto";

// This interface is now used for the GET request query parameters
interface TaobaoParams {
  [key: string]: string;
}

// Defines the structure for a Taobao API error found in the response body
interface TaobaoErrorResponse {
  error_response: {
    code: number;
    msg: string;
    sub_code?: string;
    sub_msg?: string;
    request_id: string;
  };
}

/**
 * Defines the structure of a Taobao refresh token response.
 */
interface TaobaoRefreshResponse {
  code: string;
  access_token: string;
  refresh_token: string;
  account_id: string;
  user_Id: string;
  account_platform: string;
  refresh_expires_in: string;
  error_code: string;
  expires_in: string;
  request_id: string;
  seller_Id: string;
  account: string;
  short_code: string;
}

export default class TaobaoAPI {
  private appKey: string;
  private appSecret: string;
  private baseUrl: string;
  private accessToken: string;


  constructor(appKey: string, appSecret: string, accessToken: string) {
    if (!appKey || !appSecret) {
      throw new Error("App Key and App Secret must be provided.");
    }
    this.appKey = appKey;
    this.appSecret = appSecret;
    this.accessToken = accessToken;
    this.baseUrl = "https://api.taobao.global/rest/traffic/item/get";
  }
  /**
   * Generates the HMAC-SHA256 signature based on the official Taobao Global documentation.
   * @param params The request query parameters (system and business).
   * @param apiName The API path name (e.g., /rest/product/get).
   * @returns The uppercase HEX signature string.
   */
  private generateSignature(params: TaobaoParams, apiName: string): string {
    // 1. Sort all request parameters based on the parameter names in ASCII order.
    const sortedKeys = Object.keys(params).sort();

    // 2. Concatenate the sorted parameters and their values to form a string.
    let paramString = "";
    for (const key of sortedKeys) {
      const value = params[key];
      // This check ensures that null or undefined values are not included.
      if (value !== undefined && value !== null) {
        paramString += key + value;
      }
    }

    // 3. Add the API name to the beginning of the concatenated string.
    const stringToSign = apiName + paramString;

    // 4. Encode the string in UTF-8, hash with HMAC-SHA256, and convert to hex.
    return crypto
      .createHmac("sha256", this.appSecret)
      .update(stringToSign, "utf-8")
      .digest("hex")
      .toUpperCase();
  }

    /**
   * Refreshes the Taobao API access token using the refresh token.
   
    public async refreshAccessToken(): Promise<void> {
      const url = "https://api.taobao.global/rest/auth/token/refresh";
      const apiPath = "/auth/token/refresh";
  
      const params: TaobaoParams = {
        app_key: this.appKey,
        refresh_token: this.refreshToken || '',
        sign_method: "sha256",
        timestamp: Date.now().toString(),
      };
  
      const signature = this.generateSignature(params, apiPath);
      const fullParams = { ...params, sign: signature };
  
      try {
        const response: AxiosResponse<TaobaoRefreshResponse> = await axios.post(url, null, {
          params: fullParams,
        });
  
        if (response.data.code !== "0") {
          throw new Error(
            `Failed to refresh token: [${response.data.error_code}] (Request ID: ${response.data.request_id})`
          );
        }
  
        this.accessToken = response.data.access_token;
        this.refreshToken = response.data.refresh_token;
  
        console.log(":white_check_mark: Access token refreshed successfully.");
      } catch (error: any) {
        console.error(":x: Failed to refresh access token:", error.message);
        throw error;
      }
    }
    */

  /**
   * Makes a generic GET request to a Taobao API endpoint.
   * Automatically refreshes the access token if it has expired.
   * @param apiPath The API path name (e.g., /traffic/item/get).
   * @param itemId The ID of the product.
   * @param platform The platform (e.g., 'taobao').
   * @returns A promise that resolves with the API response data.
   */
  private async makeTaobaoApiRequest(
    url: string,
    apiPath: string,
    itemId: string,
    platform: string
  ): Promise<any> {
    const params: TaobaoParams = {
      access_token: this.accessToken,
      app_key: this.appKey,
      item_id: itemId,
      item_resource: platform,
      sign_method: "sha256",
      timestamp: Date.now().toString(),
    };

    const signature = this.generateSignature(params, apiPath);
    const fullParams = { ...params, sign: signature };

    try {
      const response: AxiosResponse<any | TaobaoErrorResponse> = await axios.get(
        url,
        { params: fullParams }
      );

      if (response.data.error_response) {
        throw new Error(
          `[${response.data.error_response.code}] ${response.data.error_response.msg} (Request ID: ${response.data.error_response.request_id})`
        );
      }

      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        console.error(`Taobao API request failed to ${url}:`, error.response.data);
      } else {
        console.error(`Taobao API request failed to ${url}:`, error.message);
      }
      throw error;
    }
  }

  /**
   * Fetches product information including basic details and SKUs.
   * @param itemId The ID of the product to fetch.
   * @param platform The platform (e.g., 'taobao').
   * @returns A promise that resolves with the product data.
   */
  public async getProduct(itemId: string, platform: string): Promise<any> {
    try {
      // Get product information with SKU list
      const productResponse = await this.makeTaobaoApiRequest(
        this.baseUrl,
        "/traffic/item/get",
        itemId,
        "taobao"
      );

      return productResponse;
    } catch (error) {
      console.error(`Error fetching Taobao product data for item ${itemId}:`, error);
      throw error;
    }
  }
}