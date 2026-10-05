import httpx

from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings


# Use 8001 so it doesn't collide with FastAPI on 8000.
# Disable Host/Origin DNS-rebinding checks for local ngrok/Claude testing.
# Re-enable with an explicit allowed_hosts list before production.
mcp = FastMCP(
    "ContextOS",
    host="127.0.0.1",
    port=8001,
    transport_security=TransportSecuritySettings(
        enable_dns_rebinding_protection=False,
    ),
)

CONTEXTOS_API = "http://127.0.0.1:8000"


@mcp.tool()
async def search_context(query: str, limit: int = 5) -> dict:
    """
    Search ContextOS across memories, documents, and knowledge graph.
    """

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{CONTEXTOS_API}/search",
            json={
                "query": query,
                "limit": limit,
            },
            timeout=30.0,
        )

        response.raise_for_status()

        return response.json()


if __name__ == "__main__":
    mcp.run(transport="streamable-http")
