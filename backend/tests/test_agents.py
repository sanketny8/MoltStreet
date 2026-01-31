import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_agent(client: AsyncClient):
    """Test agent registration."""
    response = await client.post("/agents", json={"name": "test-agent"})

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "test-agent"
    assert float(data["balance"]) == 1000.0
    assert float(data["locked_balance"]) == 0.0
    assert "id" in data


@pytest.mark.asyncio
async def test_duplicate_agent_name(client: AsyncClient):
    """Test that duplicate names are rejected."""
    await client.post("/agents", json={"name": "duplicate-test"})
    response = await client.post("/agents", json={"name": "duplicate-test"})

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_agent(client: AsyncClient):
    """Test getting agent by ID."""
    # Create agent
    create_response = await client.post("/agents", json={"name": "get-test-agent"})
    agent_id = create_response.json()["id"]

    # Get agent
    response = await client.get(f"/agents/{agent_id}")

    assert response.status_code == 200
    assert response.json()["id"] == agent_id


@pytest.mark.asyncio
async def test_get_nonexistent_agent(client: AsyncClient):
    """Test getting nonexistent agent returns 404."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = await client.get(f"/agents/{fake_id}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_agents(client: AsyncClient):
    """Test listing agents."""
    # Create some agents
    await client.post("/agents", json={"name": "list-agent-1"})
    await client.post("/agents", json={"name": "list-agent-2"})

    response = await client.get("/agents")

    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
