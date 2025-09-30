import type { Context } from 'elysia';
import convertLink from '../utils/convertLink';
import { extractRelevantLink } from '../utils/extractLink';
// This function is from the artifact you provided
import { resolveMultiFormatUrl } from '../utils/itemPassword';

/**
 * Helper function to create a standardized JSON response.
 */
const jsonResponse = (body: object, status: number) => {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
};

/**
 * Optimized handler to get details from a product link.
 * It attempts a direct conversion first, and if that fails, it tries
 * to resolve the link before converting.
 */
export async function getLinkDetails(ctx: Context) {
    try {
        const { link } = ctx.body as { link?: string };

        if (!link) {
            return jsonResponse({ error: 'link query is required' }, 400);
        }

        // Attempt a direct conversion of the provided link first.
        let convertedLink = convertLink(link);

        // If the direct conversion fails, attempt the extraction and resolution flow.
        if (!convertedLink) {
            const extracted = extractRelevantLink(link);
            
            // Ensure a link was actually extracted before trying to resolve it.
            if (extracted?.link) {
                const resolvedLink = await resolveMultiFormatUrl(extracted.link);
                
                // If resolution is successful, try one final conversion on the result.
                if (resolvedLink) {
                    convertedLink = convertLink(resolvedLink);
                }
            }
        }

        // If, after all attempts, we have a valid converted link, return success.
        if (convertedLink) {
            const responseData = {
                data: convertedLink, // Standardized to return the full object for consistency.
                link: `${process.env.FRONTEND_URL}/product-detail?platform=${convertedLink.platform}&id=${convertedLink.id}`
            };
            return jsonResponse(responseData, 200);
        }

        // If all attempts fail, return a clear error.
        return jsonResponse({ error: 'Unable to process the provided product link.' }, 400);

    } catch (err: any) {
        // Log the actual error for debugging purposes on the server.
        console.error("Error in getLinkDetails:", err); 
        return jsonResponse(
            { error: 'An unexpected server error occurred.' },
            500
        );
    }
}
