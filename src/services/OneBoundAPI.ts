import axios from 'axios';
import type { OneBoundProduct } from '../types/product';
import { convertCnyToUsd } from '../utils/convertUsdToCyn';

export class OneBoundAPI {
  public async fetch(
    platform: string,
    id: string,
    lang = 'en'
  ): Promise<OneBoundProduct> {
    // Normalize "tmall" to "taobao"
    const apiPlatform = platform === 'tmall' ? 'taobao' : platform;

    // Choose endpoint based on platform
    const endpointName = apiPlatform === 'taobao' ? 'item_get_pro' : 'item_get';

    const url = new URL(`https://api-gw.onebound.cn/${apiPlatform}/${endpointName}`);
    url.searchParams.set('cache', 'no');
    url.searchParams.set('api_name', endpointName);
    url.searchParams.set('key', process.env.ONEBOUND_API_KEY || '');
    url.searchParams.set('secret', process.env.ONEBOUND_API_SECRET || '');
    url.searchParams.set('lang', lang);
    url.searchParams.set('num_iid', id);

    console.log(url.toString());
    const response = await axios.get(url.toString());
    const body = response.data as any;
  
    console.log(body)
    // OneBound item_get returns { error:…, data: { item: {…} } }
    const product = body.item ?? body.data?.item;
    if (!product) throw new Error('No item returned from OneBound');
    return product as OneBoundProduct;
  }

  public async fetchLocalShippingFee(
    platform: string,
    id: string
  ): Promise<{ product_freight_amount_usd: number; product_freight_amount_cny: number }> {
    // quick default for micro/weidian
    if (platform === 'micro' || platform === 'weidian') {
      const flatCNY = 10;
      return {
        product_freight_amount_cny: flatCNY,
        product_freight_amount_usd: convertCnyToUsd(flatCNY),
      };
    }

    const url = new URL(`https://api-gw.onebound.cn/${platform}/item_fee`);
    url.searchParams.set('cache', 'no');
    url.searchParams.set('api_name', 'item_fee');
    url.searchParams.set('key', ONEBOUND_API_KEY);
    url.searchParams.set('secret', ONEBOUND_API_SECRET);
    url.searchParams.set('lang', 'en');
    url.searchParams.set('num_iid', id);
    url.searchParams.set('area_id', '152501');
    url.searchParams.set('sku', '0');

    const response = await axios.get(url.toString());
    const body = response.data as any;

    // item_fee might return:
    //   { data: { post_fee: 12 } }
    // or { item: { post_fee: 12 } }
    // or even { post_fee: 12 } directly.
    const feeContainer = body.data ?? body.item ?? body;
    const rawPostFee = feeContainer.post_fee ?? feeContainer.postFee ?? 0;
    const freightCNY =
      typeof rawPostFee === 'number' ? rawPostFee : parseFloat(rawPostFee);
    const freightUSD = convertCnyToUsd(freightCNY);

    return {
      product_freight_amount_cny: freightCNY,
      product_freight_amount_usd: freightUSD,
    };
  }

  public getPlatform(link: string): 'taobao' | '1688' | 'micro' | 'unknown' {
    const hostname = new URL(link).hostname;
    if (hostname.includes('taobao')) return 'taobao';
    if (hostname.includes('1688')) return '1688';
    if (hostname.includes('weidian')) return 'micro';
    return 'unknown';
  }

  public async searchByImage(
    imgUrl: string,
    imgType = ''
  ): Promise<any> {
    const url = new URL('https://api-gw.onebound.cn/taobao/item_search_img/');
    url.searchParams.set('key', ONEBOUND_API_KEY);
    url.searchParams.set('secret', ONEBOUND_API_SECRET);
    url.searchParams.set('imgid', imgUrl);
    url.searchParams.set('img_type', imgType);

    const response = await axios.get(url.toString());
    return response.data;
  }

  /**
   * Fetches the “item_password” endpoint from OneBound.
   * Equivalent to running the raw https.get(...) snippet,
   * but implemented with axios for consistency.
   *
   * @param word  – the full text (e.g. Taobao password, description, etc.)
   * @param platform – normally "taobao" or "1688"; only the domain matters for this endpoint
   * @param title – usually "no" if you don’t have a specific title
   * @returns     – the parsed JSON response from OneBound
   */
  public async getItemPassword(
    word: string,
    platform: 'taobao' | '1688' = 'taobao',
    title?: string,
  ): Promise<any> {
    // Always hit the taobao/item_password endpoint
    const url = new URL(`https://api-gw.onebound.cn/${platform}/item_password`);
    url.searchParams.set('key', ONEBOUND_API_KEY);
    url.searchParams.set('secret', ONEBOUND_API_SECRET);
    url.searchParams.set('word', word.toString());
    url.searchParams.set('title', "no");
    url.searchParams.set('cache', 'no');

    try {
      const response = await axios.get(url.toString());
      console.log("Response:")
      console.log(url.toString());
      console.log(response.data);
      return response.data;

    } catch (err: any) {
      console.error('Error fetching item_password:', err.message ?? err);
      throw err;
    }
  }
}
