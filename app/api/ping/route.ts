export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!backendUrl) {
    return new Response("❌ NEXT_PUBLIC_API_URL is not defined", { status: 500 });
  }

  try {
    const res = await fetch(`${backendUrl}/health`);
    const data = await res.json();
    return new Response(`✅ Pinged backend server: ${data.status}`, { status: 200 });
  } catch (error) {
    return new Response("❌ Failed to ping backend server", { status: 500 });
  }
}
