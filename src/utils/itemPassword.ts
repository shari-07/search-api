export const resolveMultiFormatUrl = async (url: string) => {
    try {
        const response = await fetch(url, {
            redirect: 'manual',
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
            },
        });

        let dataString = null;
        if (response.status === 301 || response.status === 302) {
            dataString = response.headers.get('location');
        } else if (response.ok) {
            const html = await response.text();
            let match = html.match(/var url = '([^']+)';/);
            if (!match) {
                match = html.match(/var wirelessUrl\s*=\s*"([^"]+)";/);
            }
            if (match && match[1]) {
                dataString = match[1];
            }
        }

        if (!dataString) return null;

        const idMatch = dataString.match(/(?:offerId|id)=(\d+)/);
        if (!idMatch || !idMatch[1]) return null;
        
        const id = idMatch[1];

        if (url.includes('tb.cn')) {
            return `https://item.taobao.com/item.htm?id=${id}`;
        } else if (url.includes('1688.com')) {
            return `https://detail.1688.com/offer/${id}.html`;
        } else {
            return null;
        }
    } catch (error) {
        // In a concurrent setup, it's better to return null than to log errors.
        return null;
    }
};