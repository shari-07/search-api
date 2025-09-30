import type { ProductData } from '../types/product';

interface Raw<T> {
  source: 'cache' | string;
  data: T;
  code: number;
}

export function convertProductResponse(
  raw: Raw<ProductData>,
  exchangeRate = 6.7
) {
  const d = raw.data;
  const strip = (u: string) => u.replace(/^https?:/, '');

  return {
    code: raw.code,
    msg: 'Success',
    data: {
      ...d,
      product_image_url: strip(d.product_image_url),
      product_image_list: d.product_image_list.map(i => ({ url: strip(i.url) })),
      current_price_usd: parseFloat((d.product_price / exchangeRate).toFixed(2)),
      cache: raw.source === 'cache' ? 'yes' : 'no'
    }
  };
}
