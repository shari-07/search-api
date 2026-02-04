/**
 * Converts the raw 1688 API product data into a structured format.
 * @param apiResponse The JSON response from the 1688 product API.
 * @returns A structured JSON object with product details.
 */
export default async function transform1688Product(apiResponse: any): Promise<any> {
    if (!apiResponse?.result?.result) {
        return {
            code: -1,
            msg: "Error: Invalid or unsuccessful 1688 API response.",
            data: null,
        };
    }

    const sourceData = apiResponse.result.result;
    const cnyToUsdRate = 0.14;

    const picUrls = sourceData.productImage?.images || [];
    const skuInfoList = sourceData.productSkuInfos || [];
    const productAttributes = sourceData.productAttribute || [];
    const shippingInfo = sourceData.productShippingInfo;

    const propMap = new Map<number, { prop_type: string; prop_name: string; prop_list: any[] }>();
    const newSkuList: { [key: string]: any } = {};

    for (const sku of skuInfoList) {
        const propValues: string[] = [];
        const propNames: string[] = [];

        for (const prop of sku.skuAttributes) {
            const attributeId = prop.attributeId;
            const attributeName = prop.attributeNameTrans || prop.attributeName;
            const valueName = prop.valueTrans || prop.value;
            const pValue = `${attributeId}:${prop.value}`;

            if (!propMap.has(attributeId)) {
                propMap.set(attributeId, {
                    prop_type: attributeId.toString(),
                    prop_name: attributeName,
                    prop_list: [],
                });
            }

            const propGroup = propMap.get(attributeId)!;
            if (!propGroup.prop_list.some(p => p.p_value === pValue)) {
                propGroup.prop_list.push({
                    p_value: pValue,
                    p_name: valueName,
                    p_sku_img: prop.skuImageUrl ? `https://shariyy.com/image/image-proxy?url=${prop.skuImageUrl}` : "",
                });
            }

            propValues.push(pValue);
            propNames.push(`${attributeId}:${pValue}:${attributeName}:${valueName}`);
        }

        const skuKey = propValues.join(';');
        const price = parseFloat(sku.price || sku.consignPrice || "0");

        newSkuList[skuKey] = {
            price: price,
            total_price: 0,
            orginal_price: price,
            properties: skuKey,
            properties_name: propNames.sort().join(';'),
            quantity: sku.amountOnSale,
            sku_id: `${sku.skuId}-${sku.specId}`,
        };
    }

    let description = sourceData.description || "";
    
    description = description.replace(/<img[^>]+src=\"(https:\/\/[^\"]+)\"[^>]*>/g, (match: string, url: string) => {
        return `<img src=\"https://shariyy.com/image/image-proxy?url=${url}\"/>`;
    });

    
    description = description.match(/<img[^>]+>/g)?.join('') || "";

    const firstSkuPrice = parseFloat(skuInfoList[0]?.price || "0");
    const firstShippingDetail = shippingInfo?.skuShippingDetails?.[0];

    const transformedData = {
        code: 0,
        msg: "Success",
        data: {
            product_image_url: `https://shariyy.com/image/image-proxy?url=${picUrls[0]}` || "",
            product_image_list: picUrls.map((url: string) => ({ url: `https://shariyy.com/image/image-proxy?url=${url}` })),
            product_name: sourceData.subjectTrans || sourceData.subject,
            product_link: sourceData.promotionUrl || `https://detail.1688.com/offer/${sourceData.offerId}.html`,
            product_details: description,
            product_freight_amount_cny: 6,
            product_freight_amount_usd: 0.9,
            product_platform: "1688",
            prop_list: Array.from(propMap.values()),
            sku_prop_list: {},
            sku_prop_list_sort: [],
            props_list_origin: productAttributes.reduce((acc: any, attr: any) => {
                acc[`${attr.attributeId}:${attr.value}`] = `${attr.attributeNameTrans}:${attr.valueTrans}`;
                return acc;
            }, {}),
            sku_list: newSkuList,
            product_price: firstSkuPrice,
            current_price_usd: parseFloat((firstSkuPrice * cnyToUsdRate).toFixed(2)),
            min_num: sourceData.minOrderQuantity || 1,
            num: sourceData.productSaleInfo?.amountOnSale || 0,
            item_weight: firstShippingDetail?.weight || "",
            item_size: firstShippingDetail ? `${firstShippingDetail.length}x${firstShippingDetail.width}x${firstShippingDetail.height}` : "",
            sales: sourceData.soldOut || 0,
            store_id: sourceData.sellerOpenId || "",
            seller_name: "",
            props_img: {},
            product_item_id: sourceData.offerId.toString(),
            api_time: new Date().toISOString(),
            cache: "no",
        },
    };

    console.log(transformedData);

    return transformedData;
}
