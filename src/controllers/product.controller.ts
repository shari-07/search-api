import type { Context } from 'elysia';
import { redis } from '../config/redis';
import TaobaoAPI from '../services/TaobaoAPI';
import convertTaobaoResponse from '../utils/convertTaobaoResponse';
import { AlibabaFenxiaoCrossborderAPI } from '../services/1688API';
import transform1688Product from '../utils/convert1688Response';
import {
  transformWeidianProduct,
  getWeidianProductDescription,
  getWeidianProductDetails,
} from '../services/WeidianAPI';
import { sendDiscordLog, DiscordColors } from '../utils/sendToDiscord'; // Import updated logger

// API Keys
const appKey = process.env.TAOBAO_KEY || '';
const appSecret = process.env.TAOBAO_SECRET || '';
const accessToken = process.env.TAOBAO_ACCESS_TOKEN || '';
const alibabaAppKey = process.env.ALIBABA_1688_KEY || '';
const alibabaSecret = process.env.ALIBABA_1688_SECRET || '';
const alibabaToken = process.env.ALIBABA_1688_TOKEN || '';

// API Clients
const taobao = new TaobaoAPI(appKey, appSecret, accessToken);
const alibabaAPI = new AlibabaFenxiaoCrossborderAPI(alibabaAppKey, alibabaSecret);

const CACHE_TTL = 43200; // 12 hours

// --- IP Geolocation Utility ---

interface IpGeoData {
  country?: string;
  countryCode?: string;
  city?: string;
  isp?: string;
  query: string; // The IP address
  status: string; // 'success' or 'fail'
  message?: string; // Error message if status is 'fail'
}

async function getCountryFromIp(ip: string): Promise<IpGeoData | null> {
  // Use a reliable IP Geolocation service. ip-api.com is free but has rate limits.
  // Consider services like Abstract API, IPinfo.io, or MaxMind for production.
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.')) {
      // Don't try to geolocate local/private IPs
      return { country: 'Local/Private', query: ip, status: 'success' };
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,city,isp,query`);
    
    // Check if the response itself was successful (e.g., HTTP 200 OK)
    if (!response.ok) {
        console.error(`[Geolocation Error] IP API returned HTTP ${response.status} for ${ip}`);
        return null;
    }

    // Type assertion here: "as IpGeoData"
    const data: IpGeoData = await response.json() as IpGeoData; 
    
    // Basic runtime check for API's own status field
    if (data.status === 'fail') {
        console.warn(`[Geolocation Warning] IP API failed for ${ip}: ${data.message}`);
        return null; // Return null if the API itself indicates failure
    }

    return data;
  } catch (error) {
    console.error(`[Geolocation Error] Failed to fetch IP data for ${ip}:`, error);
    return null;
  }
}

/**
 * Fetches product details from various platforms, with caching.
 */
export async function getProductDetails(ctx: Context) {
  const startTime = performance.now(); // Start timing
  const { platform, id, lang } = ctx.query as { platform?: string; id?: string, lang?: string };

  // Declare variables for messages once at the top of the function scope
  let logMessage: string;
  let errorMessage: string;
  let statusCode: number;
  let statusText: string;
  let isCached: boolean = false;

  // Attempt to get client IP address.
  // For Elysia, ctx.request.ip is generally good if running directly.
  // If behind a proxy (like Nginx, Cloudflare), use 'x-forwarded-for'.
  const userIp = ctx.request.headers.get('x-forwarded-for') || 'unknown'; 
  const requestLang = lang || "en";
  const currentTimestamp = new Date().toISOString();

  let countryName = 'Unknown';
  const geoData = await getCountryFromIp(userIp);
  if (geoData && geoData.status === 'success' && geoData.country) {
      countryName = geoData.country;
  }

  const buildItemLink = (platform: string, id: string): string => {
      switch (platform) {
          case 'taobao': return `https://item.taobao.com/item.htm?id=${id}`;
          case 'tmall': return `https://detail.tmall.com/item.htm?id=${id}`;
          case '1688': return `https://detail.1688.com/offer/${id}.html`;
          case 'micro': return `https://weidian.com/item.html?itemID=${id}`;
          default: return `N/A`;
      }
  };
  const itemLink = buildItemLink(platform || 'unknown', id || 'unknown');

  if (!platform || !id) {
    errorMessage = 'The "platform" and "id" query parameters are required';
    statusCode = 400;
    statusText = 'Failed';
    console.error(`[Error] ${errorMessage}`);

    const endTime = performance.now();
    const processingTime = `${(endTime - startTime).toFixed(2)}ms`;

    await sendDiscordLog({
        embeds: [{
            title: `🚨 API Request Failed - Bad Request`,
            description: `**Reason:** ${errorMessage}`,
            color: DiscordColors.ERROR,
            timestamp: currentTimestamp,
            fields: [
                { name: 'Platform', value: platform || 'N/A', inline: true },
                { name: 'Item ID', value: id || 'N/A', inline: true },
                { name: 'Language', value: requestLang, inline: true },
                { name: 'Country', value: countryName, inline: true },
                { name: 'Processing Time', value: processingTime, inline: true },
                { name: 'Status Code', value: statusCode.toString(), inline: true },
                { name: 'Cached', value: 'No', inline: true },
            ],
            url: itemLink !== 'N/A' ? itemLink : undefined,
        }]
    });

    ctx.set.status = statusCode;
    return { error: errorMessage };
  }

  const cacheKey = `${requestLang}:product:${platform}:${id}`;

  try {
    // 1. Check Redis for a cached response
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      isCached = true;
      statusCode = 200;
      statusText = 'Success (Cached)';
      logMessage = `[Cache] HIT for ${cacheKey}`;
      console.log(logMessage); 
      
      const endTime = performance.now();
      const processingTime = `${(endTime - startTime).toFixed(2)}ms`;

      await sendDiscordLog({
          embeds: [{
              title: `✅ API Request Success - Cache HIT`,
              description: `Product details retrieved from cache.`,
              color: DiscordColors.SUCCESS,
              timestamp: currentTimestamp,
              fields: [
                  { name: 'Platform', value: platform, inline: true },
                  { name: 'Item ID', value: id, inline: true },
                  { name: 'Language', value: requestLang, inline: true },
                  { name: 'Country', value: countryName, inline: true },
                  { name: 'Processing Time', value: processingTime, inline: true },
                  { name: 'Status Code', value: statusCode.toString(), inline: true },
                  { name: 'Cached', value: 'Yes', inline: true },
              ],
              url: itemLink,
          }]
      });

      return JSON.parse(cachedData);
    }

    logMessage = `[Cache] MISS for ${cacheKey}. Fetching from API...`;
    console.log(logMessage);
    // Initial Discord log for cache miss - API fetch starting
    await sendDiscordLog({
        embeds: [{
            title: `⏳ API Request Initiated - Cache MISS`,
            description: `Attempting to fetch product details from external API.`,
            color: DiscordColors.WARNING,
            timestamp: currentTimestamp,
            fields: [
                { name: 'Platform', value: platform, inline: true },
                { name: 'Item ID', value: id, inline: true },
                { name: 'Language', value: requestLang, inline: true },
                { name: 'Country', value: countryName, inline: true },
                { name: 'Cached', value: 'No', inline: true },
            ],
            url: itemLink,
        }]
    });

    // 2. Fetch and transform data based on the platform
    let productData;

    switch (platform) {
      case 'taobao':
      case 'tmall': {
        const response = await taobao.getProduct(id, platform);
        console.log(response); // Still logging raw response to console if needed
        productData = await convertTaobaoResponse(response.data, lang);
        break;
      }

      case '1688': {
        const response = await alibabaAPI.queryProductDetail({
          offerId: parseInt(id, 10),
          country: 'en',
          accessToken: alibabaToken,
        });
        productData = await transform1688Product(response);
        break;
      }

      case 'micro': {
        const apiResponse = await getWeidianProductDetails(id);
        const description = await getWeidianProductDescription(id);

        if (!apiResponse) {
          errorMessage = 'Failed to fetch Weidian product details from the source.';
          statusCode = 500;
          statusText = 'Failed (External API)';
          console.error(`[Error] ${errorMessage}`);
          throw new Error(errorMessage);
        }

        const transformedData = await transformWeidianProduct(apiResponse, description, lang);
        if (transformedData.code !== 0) {
          errorMessage = transformedData.msg || 'Invalid Weidian product data.';
          statusCode = 400;
          statusText = 'Failed (Transformation)';
          console.error(`[Error] ${errorMessage}`);
          ctx.set.status = statusCode; // Set status before returning
          
          const endTime = performance.now();
          const processingTime = `${(endTime - startTime).toFixed(2)}ms`;

          await sendDiscordLog({
              embeds: [{
                  title: `❌ API Request Failed - Weidian Data Error`,
                  description: `**Reason:** ${errorMessage}`,
                  color: DiscordColors.ERROR,
                  timestamp: currentTimestamp,
                  fields: [
                      { name: 'Platform', value: platform, inline: true },
                      { name: 'Item ID', value: id, inline: true },
                      { name: 'Language', value: requestLang, inline: true },
                      { name: 'Country', value: countryName, inline: true },
                      { name: 'Processing Time', value: processingTime, inline: true },
                      { name: 'Status Code', value: statusCode.toString(), inline: true },
                      { name: 'Cached', value: 'No', inline: true },
                  ],
                  url: itemLink,
              }]
          });
          return { error: errorMessage };
        }
        productData = transformedData;
        break;
      }

      default:
        errorMessage = `Unsupported platform: "${platform}"`;
        statusCode = 400;
        statusText = 'Failed (Unsupported Platform)';
        console.error(`[Error] ${errorMessage}`);
        ctx.set.status = statusCode; // Set status before returning

        const endTime = performance.now();
        const processingTime = `${(endTime - startTime).toFixed(2)}ms`;

        await sendDiscordLog({
            embeds: [{
                title: `🚫 API Request Failed - Unsupported Platform`,
                description: `**Reason:** ${errorMessage}`,
                color: DiscordColors.ERROR,
                timestamp: currentTimestamp,
                fields: [
                    { name: 'Platform', value: platform, inline: true },
                    { name: 'Item ID', value: id || 'N/A', inline: true },
                    { name: 'Language', value: requestLang, inline: true },
                 
                    { name: 'Country', value: countryName, inline: true },
                    { name: 'Processing Time', value: processingTime, inline: true },
                    { name: 'Status Code', value: statusCode.toString(), inline: true },
                    { name: 'Cached', value: 'No', inline: true },
                ],
                url: itemLink !== 'N/A' ? itemLink : undefined,
            }]
        });
        return { error: errorMessage };
    }

    // 3. Cache the successful result before returning
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(productData));
    statusCode = 200;
    statusText = 'Success (API Fetch & Cached)';
    logMessage = `[Cache] SET for ${cacheKey}`;
    console.log(logMessage); 
    
    const endTime = performance.now();
    const processingTime = `${(endTime - startTime).toFixed(2)}ms`;

    await sendDiscordLog({
        embeds: [{
            title: `✅ API Request Success - Cache SET`,
            description: `Product details fetched from API and cached.`,
            color: DiscordColors.SUCCESS,
            timestamp: currentTimestamp,
            fields: [
                { name: 'Platform', value: platform, inline: true },
                { name: 'Item ID', value: id, inline: true },
                { name: 'Language', value: requestLang, inline: true },
             
                { name: 'Country', value: countryName, inline: true },
                { name: 'Processing Time', value: processingTime, inline: true },
                { name: 'Status Code', value: statusCode.toString(), inline: true },
                { name: 'Cached', value: 'No', inline: true }, // It was an API fetch, so not from cache for this request
            ],
            url: itemLink,
        }]
    });

    // 4. Return the response
    return productData;
    
  } catch (e: any) {
    // 5. Centralized error handling
    errorMessage = `Failed to process ${platform}:${id}: ${e.message}`;
    statusCode = 500;
    statusText = 'Failed (Internal Server Error)';
    console.error(`[Error] ${errorMessage}`);

    const endTime = performance.now();
    const processingTime = `${(endTime - startTime).toFixed(2)}ms`;

    await sendDiscordLog({
        embeds: [{
            title: `🚨 API Request Failed - Internal Server Error`,
            description: `**Reason:** ${errorMessage}`,
            color: DiscordColors.ERROR,
            timestamp: currentTimestamp,
            fields: [
                { name: 'Platform', value: platform || 'N/A', inline: true },
                { name: 'Item ID', value: id || 'N/A', inline: true },
                { name: 'Language', value: requestLang, inline: true },
               
                { name: 'Country', value: countryName, inline: true },
                { name: 'Processing Time', value: processingTime, inline: true },
                { name: 'Status Code', value: statusCode.toString(), inline: true },
                { name: 'Cached', value: isCached ? 'Yes' : 'No', inline: true }, // Reflects if an error occurred *after* cache hit
            ],
            url: itemLink !== 'N/A' ? itemLink : undefined,
        }]
    });

    ctx.set.status = statusCode;
    return { error: e.message ?? 'An internal server error occurred' };
  }
}