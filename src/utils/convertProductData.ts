// src/utils/convertProductData.ts

import type { OneBoundProduct, ProductData } from '../types/product';

export async function convertToProductData(
  data: OneBoundProduct
): Promise<ProductData> {
    if (!data || typeof data !== 'object' || !data.pic_url) {
    throw new Error('Invalid product data received from OneBound API');
  }

  const prefix = data.pic_url.startsWith('//') ? 'https:' : '';
  const imageList = data.item_imgs.map(i => ({
    url: prefix + i.url
  }));

  // Build grouped props safely, with defaults
  const groups: Record<
    string,
    {
      prop_type: string;
      prop_name: string;
      prop_list: Array<{ p_value: string; p_name: string; p_sku_img: string }>;
    }
  > = {};

  for (const [key, val] of Object.entries(data.props_list)) {
    if (typeof val !== 'string') continue;

    // Never undefined:
    const [rawName = '', display = ''] = val.split(':');
    const [propType = ''] = key.split(':');

    const propName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

    if (!groups[propType]) {
      groups[propType] = {
        prop_type: propType,
        prop_name: await translateIfChinese(propName),
        prop_list: []
      };
    }

    groups[propType].prop_list.push({
      p_value: key,
      p_name: await translateIfChinese(display),
      p_sku_img: data.props_img[key] ?? ''
    });
  }

  const price = parseFloat(data.price ?? '0');
  const freightCNY = parseFloat(data.post_fee ?? '0');
  const freightUSD = parseFloat((freightCNY * 0.14).toFixed(2));

  return {
    product_image_url: prefix + data.pic_url,
    product_image_list: imageList,
    product_name: await translateIfChinese(data.title) || "No Title",
    product_link: data.detail_url,
    product_details: data.desc || '',
    product_freight_amount_cny: freightCNY,
    product_freight_amount_usd: freightUSD,
    product_platform: '', // set by service
    prop_list: Object.values(groups),
    sku_prop_list: {},             // initial empty
    sku_prop_list_sort: [],        // fill if needed
    props_list_origin: data.props_list,
    sku_list: Array.isArray(data.skus?.sku)
      ? Object.fromEntries(data.skus.sku.map((s, i) => [s.properties, s]))
      : {},
    product_price: price,
    current_price_usd: parseFloat((price * 0.14).toFixed(2)),
    min_num: 1,
    num: parseInt(data.num),
    item_weight: data.item_weight ?? '',
    item_size: '',
    sales: parseInt(data.sales ?? data.total_sold ?? '0'),
    store_id: parseInt(data.seller_id ?? '0'),
    seller_name: data.seller_info?.nick
      ? `${data.seller_info.nick} (${await translateIfChinese(
          data.seller_info.nick
        )})`
      : data.nick,
    props_img: data.props_img,
    product_item_id: data.num_iid,
    api_time: Date.now(),
    cache: 'no'
  };
}
