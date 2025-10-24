import { Elysia } from 'elysia'
import productRoutes from '../routes/product.route'
import cors from '@elysiajs/cors'
import imageRoute from '../routes/image.route'

/** Extract the client IP from headers or socket */
function getClientIp(request: Request): string {
  const headers = request.headers

  // 1) Check X-Forwarded-For (comma-separated list)
  const forwardedFor = headers.get('x-forwarded-for') || ''
  const parts = forwardedFor.split(',')
  if (parts[0]) {
    return parts[0].trim()
  }

  // 2) Fallback to X-Real-IP
  const realIp = headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // 3) Fallback to Bun’s socket.remoteAddress (if available)
  // @ts-ignore
  const socketAddr = (request as any).socket?.remoteAddress
  if (typeof socketAddr === 'string') {
    return socketAddr
  }

  return 'unknown'
}

/** Heuristic check for proxy usage */
function isLikelyProxy(request: Request): boolean {
  const headers = request.headers
  const forwardedFor = headers.get('x-forwarded-for')
  const via = headers.get('via')
  const forwarded = headers.get('forwarded')

  if (forwardedFor) {
    // multiple entries ⇒ passed through ≥1 proxy
    if (forwardedFor.split(',').length > 1) {
      return true
    }
    // single X-Forwarded-For that differs from socket IP ⇒ proxy
    // @ts-ignore
    const sockIp = (request as any).socket?.remoteAddress
    if (sockIp && forwardedFor.trim() !== sockIp) {
      return true
    }
  }

  // Presence of Via or Forwarded header is a red flag
  if (via || forwarded) {
    return true
  }

  return false
}

export const app = new Elysia({
  serve: {
    port: parseInt(process.env.PORT || '3000'),
    hostname: '0.0.0.0',
    idleTimeout: 255
  }
})
  .use(
    cors({
      origin: '*', // or replace "*" with your frontend URL
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true
    })
  )
  // ▶ Global onRequest hook: runs before every route
  .onRequest((context) => {
    const { request } = context
    const ip = getClientIp(request)
    const proxy = isLikelyProxy(request)
    console.log(`Client IP: ${ip}  |  Using Proxy?: ${proxy}`)
  })
  // ▶ Global onError hook: catch and handle 404 (NOT_FOUND)
  .onError((context) => {
    const { code, set, path } = context
    if (code === 'NOT_FOUND') {
      console.log(`NOT_FOUND path: ${path}`)
      set.status = 404
      return 'NOT_FOUND'
    }
  })
  .use(productRoutes)
  .use(imageRoute)
  .get('/', () => {
    console.log('🏥 Health check hit - Root endpoint');
    return { 
      status: 'ok', 
      message: 'Product Search API is running',
      timestamp: new Date().toISOString(),
      port: process.env.PORT || '3000'
    };
  })
  .get('/health', () => {
    console.log('🏥 Health check hit - Health endpoint');
    return { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      port: process.env.PORT || '3000',
      redis: process.env.REDIS_URL ? 'configured' : 'not configured'
    };
  })

  // You can define additional routes here
