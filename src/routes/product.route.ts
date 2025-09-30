import { Elysia } from 'elysia'
import { getProductDetails } from '../controllers/product.controller'
import { getLinkDetails } from '../controllers/link.controller'

const productRoutes = new Elysia({ prefix: '/product' })
  .get('/details', getProductDetails)
  .post('/link', getLinkDetails)

export default productRoutes
