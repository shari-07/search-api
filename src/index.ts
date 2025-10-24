import { app } from './app/elysia'
import { resolveMultiFormatUrl } from './utils/itemPassword'

// Server startup logging
console.log("🚀 Starting Product Search API Server...");
console.log("📊 Environment Debug:");
console.log("  - NODE_ENV:", process.env.NODE_ENV || "undefined");
console.log("  - PORT environment variable:", process.env.PORT || "undefined");
console.log("  - All environment variables:", Object.keys(process.env).sort());

const port = parseInt(process.env.PORT || '3000')
console.log(`🔧 Server Configuration:`);
console.log(`  - Port: ${port}`);
console.log(`  - Hostname: 0.0.0.0`);
console.log(`  - Full URL: http://0.0.0.0:${port}`);

// Start the server
console.log(`🔄 Starting server on port ${port}...`);
app.listen({
  port: port,
  hostname: '0.0.0.0'
})

console.log(`✅ Elysia server started successfully at http://0.0.0.0:${port}`);
console.log(`🏥 Health check endpoint available at: http://0.0.0.0:${port}/health`);
console.log(`🔍 Root endpoint available at: http://0.0.0.0:${port}/`);
console.log(`📡 Server is listening for connections...`);

// Background task (commented out for now to reduce noise)
// setInterval(() => {
//     resolveMultiFormatUrl('https://e.tb.cn/h.hQqRzIly3Cz9CY3?tk=k7S942q3s1F')
// }, 1000)