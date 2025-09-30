import axios from "axios";
import crypto from "crypto";

/**
 * A client for the Alibaba Fenxiao Cross-border API.
 * This class handles request signing and communication with the API endpoints.
 */
export class AlibabaFenxiaoCrossborderAPI {
    private readonly appKey: string;
    private readonly secretKey: string;
    private readonly apiBaseUrl = 'https://gw.open.1688.com/openapi/';

    /**
     * Creates an instance of the API client.
     * @param appKey Your application's App Key.
     * @param secretKey Your application's Secret Key.
     */
    constructor(appKey: string, secretKey: string) {
        if (!appKey || !secretKey) {
            throw new Error('App Key and Secret Key must be provided.');
        }
        this.appKey = appKey;
        this.secretKey = secretKey;
    }

    /**
     * Generates the signature required for API requests.
     * The signing process is HMAC-SHA1.
     * @param urlPath The path part of the API URL (e.g., "param2/1/namespace/apiName/appKey").
     * @param params The request parameters used for signing.
     * @returns The uppercase HMAC-SHA1 signature.
     * @private
     */
    private signRequest(urlPath: string, params: Record<string, string>): string {
        // 1. Sort parameter keys alphabetically.
        const sortedKeys = Object.keys(params).sort();

        // 2. Concatenate sorted key-value pairs into a single string.
        const paramString = sortedKeys.map(key => `${key}${params[key]}`).join('');

        // 3. Combine the URL path and the parameter string.
        const stringToSign = `${urlPath}${paramString}`;

        // 4. Calculate the HMAC-SHA1 signature using the secret key.
        const hmac = crypto.createHmac('sha1', this.secretKey);
        hmac.update(stringToSign);

        // 5. Convert the signature to an uppercase hexadecimal string.
        return hmac.digest('hex').toUpperCase();
    }

    /**
     * Fetches multilingual product details for a given product ID.
     * Implements the 'com.alibaba.fenxiao.crossborder:product.search.queryProductDetail-1' API.
     * @param options - The options for the product detail query.
     * @param options.offerId - The product ID. Note: The API doc specifies this as 'offerld'.
     * @param options.country - The language code (e.g., 'en' for English, 'ja' for Japanese).
     * @param options.accessToken - The user authorization token.
     * @param options.outMemberId - Optional: An external user ID.
     * @returns A promise that resolves with the product information.
     */
    public async queryProductDetail(options: {
        offerId: number;
        country: string;
        accessToken: string;
        outMemberId?: string;
    }): Promise<any> {
        const { offerId, country, accessToken, outMemberId } = options;

        // The specific URL path for the queryProductDetail API
        const urlPath = `param2/1/com.alibaba.fenxiao.crossborder/product.search.queryProductDetail/${this.appKey}`;

        // Prepare the 'offerDetailParam' object as required by the API.
        // This object will be JSON-stringified.
        const offerDetailParam: { offerId: number; country: string; outMemberId?: string } = {
            offerId: offerId, // Using 'offerId' to match the API documentation literally.
            country: "en",
            outMemberId: "1"
        };

        // All parameters, including system-level ones and the stringified application parameter,
        // are required for generating the signature.
        const paramsForSigning: Record<string, string> = {
            'access_token': accessToken,
            '_aop_timestamp': Date.now().toString(),
            'offerDetailParam': JSON.stringify(offerDetailParam),
        };

        // Generate the signature using the unchanged signing method.
        const signature = this.signRequest(urlPath, paramsForSigning);

        // Construct the full request URL. Following the original code's pattern,
        // all parameters and the signature are placed in the query string.
        const queryParams = new URLSearchParams({
            ...paramsForSigning,
            '_aop_signature': signature,
        });

        const requestUrl = `${this.apiBaseUrl}${urlPath}?${queryParams.toString()}`;

        console.log(`Requesting URL: ${requestUrl}`);

        try {
            // Make a POST request to the constructed URL.
            // Axios will throw an error for non-2xx responses, which will be caught.
            const response = await axios.get(requestUrl);
            return response.data;
        } catch (error) {
            console.error('Error fetching product details:', error);
            // Re-throw the error to allow the caller to handle it.
            throw error;
        }
    }
}
