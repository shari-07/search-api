import { app } from './app/elysia'
import { resolveMultiFormatUrl } from './utils/itemPassword'

setInterval(() => {
    resolveMultiFormatUrl('https://e.tb.cn/h.hQqRzIly3Cz9CY3?tk=k7S942q3s1F')
}, 1000)
app.listen(3000)

console.log(`🦊 Elysia is running at http://localhost:3000`)