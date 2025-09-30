import axios from 'axios';
import { translate } from './translateService';

// -------------------------------------------------------------------
// 1. TYPE DEFINITIONS for the FINAL STRUCTURED DATA
// -------------------------------------------------------------------

/**
 * Represents a single product image.
 */
interface ProductImage {
    url: string;
}

/**
 * Represents a single value within a property list (e.g., "Red", "Size L").
 */
interface PropertyValue {
    p_value: string;        // Unique identifier (e.g., "attributeId:value")
    p_name: string;         // Display name (e.g., "Red")
    p_sku_img?: string;     // Optional image URL for this specific property value
}

/**
 * Represents a group of properties (e.g., "Color", "Size").
 */
interface PropertyList {
    prop_type: string;      // The type of property (e.g., "Color")
    prop_name: string;      // The display name of the property
    prop_list: PropertyValue[];
}

/**
 * Represents a single Stock Keeping Unit (SKU) with its specific details.
 */
interface Sku {
    price: number;
    total_price: number;
    orginal_price: number;
    properties: string;      // Semicolon-separated property value identifiers (e.g., "1:1;2:4")
    properties_name: string; // Semicolon-separated property names (e.g., "Color:Red;Size:L")
    quantity: number;
    sku_id: string;
}

/**
 * The final, structured representation of all product details.
 */
export interface ProductDetails {
    code: number;
    msg: string;
    data: {
        product_image_url: string;
        product_image_list: ProductImage[];
        product_name: string;
        product_link: string;
        product_details: string; // This will now be populated with HTML
        product_freight_amount_cny: number;
        product_freight_amount_usd: number;
        product_platform: "yupoo" | "weidian" | "1688" | "taobao" | "micro";
        prop_list: PropertyList[];
        sku_prop_list: any;
        sku_prop_list_sort: any[];
        props_list_origin: any;
        sku_list: { [key: string]: Sku };
        product_price: number;
        current_price_usd: number;
        min_num: number;
        num: number;
        item_weight: string;
        item_size: string;
        sales: number;
        store_id: string;
        seller_name: string;
        props_img: any;
        product_item_id: string;
        api_time: string;
        cache: "yes" | "no";
    } | null;
}


// -------------------------------------------------------------------
// 2. TYPE DEFINITIONS for the RAW API RESPONSES
// -------------------------------------------------------------------

// 2.1 Types for Product SKU/Details API
interface ApiAttrValue {
    attrId: number;
    attrValue: string;
    img: string;
    isShowHotTag: boolean;
}

interface ApiAttrList {
    attrTitle: string;
    attrValues: ApiAttrValue[];
}

interface ApiSkuInfo {
    discountPrice: number;
    originalPrice: number;
    id: number;
    stock: number;
    title: string;
    img: string;
}

interface ApiSku {
    attrIds: number[];
    skuInfo: ApiSkuInfo;
}

interface ApiDetailsResult {
    attrList: ApiAttrList[];
    itemDiscountLowPrice: number;
    itemTitle: string;
    itemId: string;
    itemMainPic: string;
    itemStock: number;
    skuInfos: ApiSku[];
}

interface WeidianDetailsApiResponse {
    status: { code: number; message: string; };
    result: ApiDetailsResult;
}

// 2.2 Types for Product Description API
interface ApiDescContent {
    type: number; // 2 for image, 1 for text, 10000 for text/foldable section
    url?: string;
    text?: string;
}

interface ApiItemDetail {
    desc_content: ApiDescContent[];
}

interface ApiDescriptionResult {
    item_detail: ApiItemDetail;
}

interface WeidianDescriptionApiResponse {
    status: { code: number; message: string; };
    result: ApiDescriptionResult;
}


// -------------------------------------------------------------------
// 3. API FETCHING FUNCTIONS
// -------------------------------------------------------------------

/**
 * Fetches main product details (SKUs, price, etc.) from the Weidian API.
 * @param id The Weidian product ID.
 * @returns The raw API details result or null if an error occurs.
 */
export async function getWeidianProductDetails(id: string): Promise<ApiDetailsResult | null> {
    console.log(`🚀 Fetching product details for Weidian ID: ${id}`);
    const params = { itemId: id };
    const encodedParams = encodeURIComponent(JSON.stringify(params));
    const timestamp = Date.now();
    const apiUrl = `https://thor.weidian.com/detail/getItemSkuInfo/1.0?param=${encodedParams}&_=${timestamp}`;

    try {
        const response = await axios.get<WeidianDetailsApiResponse>(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
            },
        });
        if (response.data.status?.code === 0 && response.data.result) {
            console.log("✔️ Details fetched successfully!");
            return response.data.result;
        } else {
            console.error("❌ Details API returned an error:", response.data.status?.message || 'Unknown API error');
            return null;
        }
    } catch (error) {
        console.error(`❌ Error fetching product details:`, error);
        return null;
    }
}

/**
 * Fetches product description (images and text) from the Weidian API.
 * @param id The Weidian product ID.
 * @returns The raw API description result or null if an error occurs.
 */
export async function getWeidianProductDescription(id: string): Promise<ApiDescriptionResult | null> {
    console.log(`📝 Fetching product description for Weidian ID: ${id}`);
    const params = { vItemId: id };
    const encodedParams = encodeURIComponent(JSON.stringify(params));
    const timestamp = Date.now();
    const apiUrl = `https://thor.weidian.com/detail/getDetailDesc/1.0?param=${encodedParams}&_=${timestamp}`;

    try {
        const response = await axios.get<WeidianDescriptionApiResponse>(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
            },
        });
        if (response.data.status?.code === 0 && response.data.result) {
            console.log("✔️ Description fetched successfully!");
            return response.data.result;
        } else {
            console.error("❌ Description API returned an error:", response.data.status?.message || 'Unknown API error');
            return null;
        }
    } catch (error) {
        console.error(`❌ Error fetching product description:`, error);
        return null;
    }
}


// -------------------------------------------------------------------
// 4. DATA TRANSFORMATION FUNCTION
// -------------------------------------------------------------------

/**
 * Converts the raw Weidian API data into a structured format.
 * @param detailsData The 'result' object from the details API.
 * @param descriptionData The 'result' object from the description API.
 * @returns A structured ProductDetails object.
 */
export async function transformWeidianProduct(
    detailsData: ApiDetailsResult,
    descriptionData: ApiDescriptionResult | null,
    lang?: string
): Promise<ProductDetails> {
    const currentLang = lang || 'en';
    const cnyToUsdRate = 0.14; // Approximate conversion rate

    // --- Input Validation ---
    if (!detailsData || typeof detailsData !== 'object' || !detailsData.itemId) {
        console.error("Validation Error: Invalid or incomplete Weidian product details data received.", detailsData);
        return {
            code: -1,
            msg: "Error: Invalid or incomplete Weidian product details data.",
            data: {
                product_image_url: "", product_image_list: [], product_name: "Error", product_link: "",
                product_details: "", product_freight_amount_cny: 0, product_freight_amount_usd: 0,
                product_platform: "weidian", prop_list: [], sku_prop_list: {}, sku_prop_list_sort: [],
                props_list_origin: {}, sku_list: {}, product_price: 0, current_price_usd: 0,
                min_num: 0, num: 0, item_weight: "", item_size: "", sales: 0, store_id: "",
                seller_name: "", props_img: {}, product_item_id: "", api_time: new Date().toISOString(), cache: "no"
            },
        };
    }

    // --- Translation Data Collection Phase ---
    const translationPromises: Promise<string>[] = [];
    const translationKeys: string[] = []; // Stores unique identifiers for translated strings
    const queueTranslation = (text: string | null | undefined, keyPrefix: string): string | null => {
        if (typeof text === 'string' && text.trim() !== '') {
            const uniqueKey = `${keyPrefix}`;
            translationPromises.push(translate(text, currentLang));
            translationKeys.push(uniqueKey);
            return uniqueKey;
        }
        return null;
    };

    // --- 1. Process Description into HTML (No Translation Needed Here) ---
    let productDetailsHtml = "";
    if (descriptionData?.item_detail?.desc_content) {
        const imageElements = descriptionData.item_detail.desc_content
            .filter(item => item.type === 2 && item.url && typeof item.url === 'string' && item.url.trim() !== '')
            .map(item => `<img src="${item.url}" style="display: block;width: 100.0%;height: auto;"/>`)
            .join('\r\n        ');

        if (imageElements) {
            productDetailsHtml = `<div id="offer-template-0"></div><div style="width: 790.0px;">\r\n        ${imageElements}\r\n    </div><p>&nbsp;&nbsp;</p>`;
        }
    }

    // --- Initialize SKU-related variables with default empty states ---
    let finalPropList: PropertyList[] = [];
    let skuList: { [key: string]: Sku; } = {};
    let props_list_origin: { [key: string]: string } = {};

    // --- 2. Conditionally Process SKU and Property Data ---
    // This block only runs if SKU data (`attrList` and `skuInfos`) is available.
    if (detailsData.attrList && detailsData.attrList.length > 0 && detailsData.skuInfos && detailsData.skuInfos.length > 0) {
        const originalAttributeValueMap = new Map<number, { name: string; type: string }>();
        const tempPropListStructure: {
            originalAttrTitle: string;
            translatedAttrTitleKey: string | null;
            tempAttrValues: {
                p_value: string;
                originalAttrValue: string;
                translatedAttrValueKey: string | null;
                p_sku_img: string;
            }[];
        }[] = [];

        detailsData.attrList.forEach((attrGroup) => {
            const originalAttrTitle = attrGroup.attrTitle || '';
            const translatedAttrTitleKey = queueTranslation(originalAttrTitle, `attrTitle_${attrGroup.attrTitle}`); // Use a more stable key
            const tempAttrValues: { p_value: string; originalAttrValue: string; translatedAttrValueKey: string | null; p_sku_img: string; }[] = [];
            attrGroup.attrValues.forEach((val) => {
                const originalAttrValue = val.attrValue || '';
                const translatedAttrValueKey = queueTranslation(originalAttrValue, `attrValue_${val.attrId}`);
                originalAttributeValueMap.set(val.attrId, { name: originalAttrValue, type: originalAttrTitle });
                tempAttrValues.push({
                    p_value: val.attrId.toString(),
                    originalAttrValue: originalAttrValue,
                    translatedAttrValueKey: translatedAttrValueKey,
                    p_sku_img: val.img || "",
                });
            });
            tempPropListStructure.push({ originalAttrTitle, translatedAttrTitleKey, tempAttrValues });
        });
        
        // This is a temporary structure that will be populated post-translation
        finalPropList = tempPropListStructure.map(tempPropGroup => ({
            prop_type: tempPropGroup.originalAttrTitle,
            prop_name: tempPropGroup.originalAttrTitle, // Will be replaced by translation
            prop_list: tempPropGroup.tempAttrValues.map(tempValue => ({
                p_value: tempValue.p_value,
                p_name: tempValue.originalAttrValue, // Will be replaced by translation
                p_sku_img: tempValue.p_sku_img,
            })),
        }));

        for (const sku of detailsData.skuInfos) {
            if (!sku || !sku.skuInfo || !Array.isArray(sku.attrIds) || sku.attrIds.length === 0) {
                console.warn(`Skipping invalid SKU entry:`, sku);
                continue;
            }
            const sortedAttrIds = [...sku.attrIds];
            const skuKey = sortedAttrIds.join(';');
            const originalPropertiesName = sortedAttrIds
                .map(id => originalAttributeValueMap.get(id)?.name || '')
                .filter(Boolean)
                .join('; ');
            queueTranslation(originalPropertiesName, `propertiesName_${skuKey}`);
            const price = parseFloat((sku.skuInfo.discountPrice / 100).toFixed(2));
            skuList[skuKey] = {
                price,
                total_price: 0,
                orginal_price: price,
                properties: skuKey,
                properties_name: originalPropertiesName, // Will be replaced by translation
                quantity: sku.skuInfo.stock,
                sku_id: sku.skuInfo.id.toString(),
            };
        }
    }
    // If the `if` block was skipped, `finalPropList`, `skuList`, and `props_list_origin` remain empty.

    // Collect product title for translation (independent of SKUs)
    const productTitleOriginal = detailsData.itemTitle || '';
    const productTitleTranslatedKey = queueTranslation(productTitleOriginal, 'productTitle');

    // --- 3. Execute all collected translations in parallel ---
    const translatedResults = await Promise.all(translationPromises);
    const translatedMap = new Map<string, string>();
    translationKeys.forEach((key, index) => {
        translatedMap.set(key, translatedResults[index] ?? '');
    });

    // --- 4. Apply Translated Values Back to Structures ---
    // These loops will not run if finalPropList and skuList are empty, making them safe.
    finalPropList.forEach(propGroup => {
        const translatedPropName = translatedMap.get(`attrTitle_${propGroup.prop_type}`) ?? propGroup.prop_name;
        propGroup.prop_name = translatedPropName;
        propGroup.prop_list.forEach(propValue => {
            propValue.p_name = translatedMap.get(`attrValue_${propValue.p_value}`) ?? propValue.p_name;
            // Clear image for size-related properties
            if (["尺码", "size", "taille", "tamaño"].includes(translatedPropName.toLocaleLowerCase())) {
                propValue.p_sku_img = "";
            }
        });
    });

    for (const skuKey in skuList) {
        if (Object.prototype.hasOwnProperty.call(skuList, skuKey)) {
            const translatedName = translatedMap.get(`propertiesName_${skuKey}`);
            if (translatedName) {
                // @ts-ignore
                skuList[skuKey].properties_name = translatedName;
            }
        }
    }
    
    // Generate origin_list from the final translated propList
    for (const propGroup of finalPropList) {
        for (const propValue of propGroup.prop_list) {
            props_list_origin[propValue.p_value] = `${propGroup.prop_name}:${propValue.p_name}`;
        }
    }

    // --- 5. Process Product Image URLs ---
    const mainPicUrl = (typeof detailsData.itemMainPic === 'string' && detailsData.itemMainPic.trim() !== '') ? detailsData.itemMainPic : null;
    
    // **FIXED**: Use optional chaining (`?.`) and nullish coalescing (`??`) 
    // to prevent crash when `detailsData.attrList` is undefined.
    const yupooCodeImages = (detailsData.attrList ?? [])
        .flatMap(attrGroup => attrGroup.attrValues.map(val => val.img))
        .filter((url): url is string => typeof url === 'string' && url.trim() !== '');

    const allImages = (mainPicUrl ? [mainPicUrl] : []).concat(yupooCodeImages);
    const uniqueImages = [...new Set(allImages)];
    const firstSkuPrice = parseFloat((detailsData.itemDiscountLowPrice / 100).toFixed(2)) || 0;

    // --- 6. Assemble the Final Transformed Data Object ---
    const transformedData: ProductDetails = {
        code: 0,
        msg: "Success",
        data: {
            product_image_url: uniqueImages[0] || "",
            product_image_list: uniqueImages.map(url => ({ url })),
            product_name: translatedMap.get(productTitleTranslatedKey ?? '') ?? productTitleOriginal,
            product_link: `https://weidian.com/item.html?itemID=${detailsData.itemId}`,
            product_details: productDetailsHtml,
            product_freight_amount_cny: 10,
            product_freight_amount_usd: 1.49,
            product_platform: "micro",
            prop_list: finalPropList,
            sku_prop_list: {},
            sku_prop_list_sort: [],
            props_list_origin: props_list_origin,
            sku_list: skuList,
            product_price: firstSkuPrice,
            current_price_usd: parseFloat((firstSkuPrice * cnyToUsdRate).toFixed(2)),
            min_num: 1,
            num: detailsData.itemStock,
            item_weight: "",
            item_size: "",
            sales: 0,
            store_id: detailsData.itemId.toString(),
            seller_name: "",
            props_img: {},
            product_item_id: detailsData.itemId.toString(),
            api_time: new Date().toISOString(),
            cache: "no",
        },
    };

    return transformedData;
}