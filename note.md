SOCKET_SERVER_URL=https://your-realtime-service.railway.app
NEXT_PUBLIC_SOCKET_URL=wss://your-realtime-service.railway.app

E2B_ENABLED=true  
E2B_API_KEY=your_key_here  

vercel.json =
{  
  "buildCommand": "cd apps/sim && NODE_OPTIONS='--max-old-space-size=8192' next build",  
  "outputDirectory": "apps/sim/.next",  
  "installCommand": "bun install",  
  "framework": "nextjs",  
  "rootDirectory": "apps/sim"  
}

