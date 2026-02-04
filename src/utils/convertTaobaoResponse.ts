import { cache } from "../config/cache";
const CACHE_TTL = 24 * 60 * 60; // 48 hours 
/**
 * Transforms raw Taobao data into a structured format without translation.
 * This function is pure and only focuses on structuring the data.
 * @param sourceData The JSON response from the Taobao product API.
 * @returns A structured, but untranslated, JSON object with product details.
 */
function transformRawTaobaoData(sourceData: any): any {
    const cnyToUsdRate = 0.14;
    const picUrls = sourceData.pic_urls || [];
    const skuList = sourceData.sku_list || [];

    const propMap = new Map<number, { prop_type: string; prop_name: string; prop_list: any[] }>();
    const newSkuList: { [key: string]: any } = {};

    for (const sku of skuList) {
        const propValues: string[] = [];
        const propNamesOriginal: string[] = [];

        for (const prop of sku.properties) {
            const propName = prop.prop_name || '';
            if (!propMap.has(prop.prop_id)) {
                propMap.set(prop.prop_id, {
                    prop_type: prop.prop_id.toString(),
                    prop_name: propName,
                    prop_list: [],
                });
            }

            const propGroup = propMap.get(prop.prop_id)!;
            const pValue = `${prop.prop_id}:${prop.value_id}`;
            const valueName = prop.value_name || '';
            
            if (!propGroup.prop_list.some(p => p.p_value === pValue)) {
                propGroup.prop_list.push({
                    p_value: pValue,
                    p_name: valueName,
                    p_sku_img: sku.pic_url,
                });
            }

            propValues.push(pValue);
            propNamesOriginal.push(`${prop.prop_id}:${prop.value_id}:${propName}:${valueName}`);
        }

        const skuKey = propValues.join(';');
        newSkuList[skuKey] = {
            price: (sku.promotion_price / 100),
            total_price: 0,
            orginal_price: (sku.price / 100),
            properties: skuKey,
            properties_name: propNamesOriginal.join(';'), // Store original joined string
            quantity: sku.quantity,
            sku_id: sku.sku_id.toString(),
        };
    }

    const origin_list: { [key: string]: any } = {};
    const propArray = Array.from(propMap.values());
    for (const prop of propArray) {
        for (const prop_item of prop.prop_list) {
            origin_list[prop_item.p_value] = `${prop.prop_name}:${prop_item.p_name}`;
        }
    }

    // This is the untranslated, transformed data object
    return {
        code: 0,
        msg: "Success",
        data: {
            product_image_url: picUrls[0] || Array.from(propMap.values())[0]?.prop_list[0].p_sku_img || "",
            product_image_list: picUrls.map((url: string) => ({ url })),
            product_name: sourceData.title || "No Title",
            product_link: `https://item.taobao.com/item.htm?id=${sourceData.item_id}`,
            product_details: sourceData.description,
            product_freight_amount_cny: (skuList[0]?.postFee / 100 || 0),
            product_freight_amount_usd: parseFloat(((skuList[0]?.postFee / 100 || 0) * cnyToUsdRate).toFixed(2)),
            product_platform: "taobao",
            prop_list: Array.from(propMap.values()),
            sku_prop_list: {},
            sku_prop_list_sort: [],
            props_list_origin: origin_list,
            sku_list: newSkuList,
            product_price: (sourceData.promotion_price / 100),
            current_price_usd: ((sourceData.promotion_price  / 100) / 6.65),
            min_num: sourceData.begin_amount || 1,
            num: sourceData.quantity,
            item_weight: "",
            item_size: "",
            sales: 0,
            store_id: sourceData.shop_id,
            seller_name: sourceData.shop_name,
            props_img: {},
            product_item_id: sourceData.item_id.toString(),
            api_time: sourceData._trace_id_,
            cache: 'no', // Default to 'no', will be updated by the orchestrator
        },
    };
}



/**
 * Main function: Converts raw Taobao API data into a structured format,
 * while caching the data.
 * @param taobaoResponse The JSON response from the Taobao product API.
 * @param lang The target language (deprecated, no longer used).
 * @param cached Whether the initial data was from cache (for response metadata).
 * @returns A structured JSON object with product details.
 */
export default async function transformTaobaoProduct(taobaoResponse: any, lang?: string, cached?: boolean): Promise<any> {
    if (!taobaoResponse || !taobaoResponse.item_id) {
        return {
            code: -1,
            msg: "Error: Invalid or unsuccessful Taobao API response.",
            data: null,
        };
    }

    // Step 1: Transform the raw data into a structured, untranslated object.
    const untranslatedData = transformRawTaobaoData(taobaoResponse);
    untranslatedData.data.cache = cached ? 'yes' : 'no'; // Set cache status

    // Step 2: Save the untranslated data to Redis cache.
    // The key ensures we cache per product ID.
    const cacheKey = `zh:product:taobao:${untranslatedData.data.product_item_id}`;
    await cache.set(cacheKey, untranslatedData, CACHE_TTL);

    // Return the untranslated (but structured) data.
    return untranslatedData;
}