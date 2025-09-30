import { OneBoundAPI } from './OneBoundAPI';
import { convertToProductData } from '../utils/convertProductData';
import type { ProductData } from '../types/product';

export class ProductService {
  private api = new OneBoundAPI();

  public async getDetails(platform: string, id: string): Promise<ProductData> {
    // 1) fetch the raw item
    const item = await this.api.fetch(platform, id);



    // 3) run both in parallel:
    const [localShippingFee, data] = await Promise.all([
      this.api.fetchLocalShippingFee(platform, item.num_iid),
      convertToProductData(item)
    ]);

    // 4) inject platform and merge results
    data.product_platform = platform;
    return {
      ...data,
      ...localShippingFee
    };
  }
}
