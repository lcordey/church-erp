export async function POST() {
  return new Response(null, {
    status: 303,
    headers: {
      location: "/worship",
      "set-cookie": "churcherp_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    },
  });
}
