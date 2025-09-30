import { Elysia } from 'elysia'


const imageRoute = new Elysia({ prefix: '/image' })
    .get('/image-proxy', async ({ query, set }) => {
        const imageUrl = query.url;

        if (!imageUrl) {
            set.status = 400;
            return 'Missing image URL';
        }

        try {
            const res = await fetch(imageUrl);

            if (!res.ok || !res.body) {
                set.status = res.status;
                return `Failed to fetch image: ${res.statusText}`;
            }

            const contentType = res.headers.get('content-type') ?? 'image/jpeg';

            return new Response(res.body, {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=86400',
                },
            });
        } catch (err) {
            set.status = 500;
            return 'Internal proxy error';
        }
    });

export default imageRoute;