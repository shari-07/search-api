export interface OneBoundProduct {
    pic_url: string;
    item_imgs: Array<{ url: string }>;
    title: string;
    detail_url: string;
    desc?: string;
    post_fee?: string;
    price?: string;
    orginal_price?: number;
    props: Array<{ name: string; value: string }>;
    props_list: Record<string, string>;
    skus?: { sku: any[] };
    seller_id?: string;
    seller_info?: { nick: string };
    nick: string;
    props_img: Record<string, string>;
    num_iid: string;
    num: string;
    sales?: string;
    total_sold?: string;
    item_weight?: string;
    product_freight_amount_cny: number;
    product_freight_amount_usd: number;
}

export interface ProductData {
    product_image_url: string;
    product_image_list: Array<{ url: string }>;
    product_name: string;
    product_link: string;
    product_details: string;
    product_freight_amount_cny: number;
    product_freight_amount_usd: number;
    product_platform: string;
    prop_list: Array<{
        prop_name: string;
        prop_type: string;
        prop_list: Array<any>;
    }>;
    sku_prop_list: Record<string, string>;
    sku_prop_list_sort: string[];
    props_list_origin: Record<string, string>;
    sku_list: Record<string, any>;
    product_price: number;
    current_price_usd: number;
    min_num: number;
    num: number;
    item_weight: string;
    item_size: string;
    sales: number;
    store_id: number;
    seller_name: string;
    props_img: Record<string, string>;
    product_item_id: string;
    api_time: number;
    cache: 'yes' | 'no';
}
