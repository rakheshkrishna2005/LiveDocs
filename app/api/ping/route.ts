export async function GET() {
  try {
    const res = await fetch("https://livedocs-backend-production.up.railway.app/health");
    const data = await res.json();
    return new Response(`✅ Pinged backend server: ${data.status}`, { status: 200 });
  } catch (error) {
    return new Response("❌ Failed to ping backend server", { status: 500 });
  }
}
