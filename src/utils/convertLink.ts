export interface ConvertedLink {
  short_original_link: string;
  id: string;
  platform: string;
}

export default function convertLink(input: string): ConvertedLink | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch(err) {
    console.log(`Invalid URL: ${input}`, err);
    return null;
  }

  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  const params = url.searchParams;

  const to1688 = (id: string): ConvertedLink => ({
    short_original_link: `https://detail.1688.com/offer/${id}.html`,
    id,
    platform: "1688",
  });
  const toTaobao = (id: string): ConvertedLink => ({
    short_original_link: `https://item.taobao.com/item.htm?id=${id}`,
    id,
    platform: "taobao",
  });
  const toWeidian = (id: string): ConvertedLink => ({
    short_original_link: `https://weidian.com/item.html?itemID=${id}`,
    id,
    platform: "micro",
  });
  const toTmall = (id: string): ConvertedLink => ({
    short_original_link: `https://detail.tmall.com/item.htm?id=${id}`,
    id,
    platform: "tmall",
  });

  const getEncodedUrl = (): string | null => {
    const match = url.hash.match(/[?&]url=([^&]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
    const q = params.get("url") ?? params.get("q");
    return q ? decodeURIComponent(q) : null;
  };

  // hoobuy.com/product/{type}/{id}
  if (host.includes("hoobuy.com")) {
    const parts = path.split("/").filter(Boolean);
    const type = parts[1] ?? "";
    const id   = parts[2] ?? "";
    if (!id) return null;
    if (type === "0") return to1688(id);
    if (type === "1") return toTaobao(id);
    if (type === "2") return toWeidian(id);
    return null;
  }

  // 1688.com
  if (host.includes("1688.com")) {
    const offerId =
      params.get("offerId")
      ?? path.match(/\/offer\/(\d+)\.html/)?.[1]
      ?? path.match(/\/offer\/(\d+)/)?.[1];
    return offerId ? to1688(offerId) : null;
  }

  // Generic forwarders
  const forwardingHosts = [
    "mulebuy.com",
    "joyabuy.com",
    "cnfans.com",
    "orientdig.com",
    "lovegobuy.com",
    "acbuy.com",
    "oopbuy.com",
  ];
  if (forwardingHosts.some(d => host.includes(d))) {
    const id   = params.get("id");
    const type = (params.get("shop_type")
               ?? params.get("shoptype")
               ?? params.get("source")
               ?? params.get("platform")
               ?? ""
               ).toLowerCase();
    if (!id || !type) return null;
    if (type === "weidian")            return toWeidian(id);
    if (type === "taobao")             return toTaobao(id);
    if (type === "tmall")              return toTmall(id);
    if (["1688", "ali_1688"].includes(type)) return to1688(id);
    return null;
  }

  // Encoded URL handlers (recurse on decoded)
  const encodedHosts = ["loongbuy.com", "kakobuy.com", "superbuy.com", "google.com"];
  if (encodedHosts.some(d => host.includes(d))) {
    const decoded = getEncodedUrl();
    return decoded ? convertLink(decoded) : null;
  }

  // weidian.com
  if (host.includes("weidian.com")) {
    const id = params.get("itemID") ?? params.get("itemId");
    if (id) return toWeidian(id);
    // fallback to raw URL (no ID)
    return { short_original_link: input.split("?")[0] as string, id: "", platform: "weidian" };
  }

  // tmall.com
  if (host.includes("tmall.com")) {
    const id = params.get("id");
    return id ? toTmall(id) : null;
  }

  // taobao.com
  if (host.includes("taobao.com")) {
    const id = params.get("id");
    return id ? toTaobao(id) : null;
  }

  // detail.1688.com
  if (host.includes("detail.1688.com")) {
    const id = path.split("/").pop()?.replace(".html", "") ?? "";
    return id ? to1688(id) : null;
  }

  // niuniubox.com
  if (host.includes("niuniubox.com")) {
    const searchText = params.get("search_text");
    const convert_search_text = convertLink(searchText ?? "");
    return convert_search_text
  }

  return null;
}
