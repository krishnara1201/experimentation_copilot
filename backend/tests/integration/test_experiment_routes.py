import pytest


@pytest.mark.asyncio
async def test_experiment_metric_variant_crud_and_access_control(client, auth_headers, second_user_headers):
    create_experiment = await client.post(
        "/api/experiments/",
        params={"name": "Experiment A", "description": "description"},
        headers=auth_headers,
    )
    assert create_experiment.status_code == 200

    list_response = await client.get("/api/experiments/", headers=auth_headers)
    assert list_response.status_code == 200
    experiment = list_response.json()["experiments"][0]

    owner_can_get = await client.get(f"/api/experiments/{experiment['id']}", headers=auth_headers)
    assert owner_can_get.status_code == 200

    non_owner_cannot_get = await client.get(
        f"/api/experiments/{experiment['id']}", headers=second_user_headers
    )
    assert non_owner_cannot_get.status_code == 404

    create_metric = await client.post(
        f"/api/experiments/{experiment['id']}/metrics",
        params={
            "metric_name": "conversion",
            "metric_type": "binary",
            "metric_direction": "up",
            "is_primary": True,
            "is_guardrail": False,
        },
        headers=auth_headers,
    )
    assert create_metric.status_code == 200
    metric = create_metric.json()["metric"]

    get_metric = await client.get(
        f"/api/experiments/{experiment['id']}/metrics/{metric['id']}", headers=auth_headers
    )
    assert get_metric.status_code == 200

    create_variant = await client.post(
        f"/api/experiments/{experiment['id']}/variants",
        params={"variant_name": "control", "is_control": True, "allocation_percentage": 50},
        headers=auth_headers,
    )
    assert create_variant.status_code == 200
    variant = create_variant.json()["variant"]

    delete_variant = await client.delete(
        f"/api/experiments/{experiment['id']}/variants/{variant['id']}", headers=auth_headers
    )
    assert delete_variant.status_code == 200

    delete_metric = await client.delete(
        f"/api/experiments/{experiment['id']}/metrics/{metric['id']}", headers=auth_headers
    )
    assert delete_metric.status_code == 200

    delete_experiment = await client.delete(f"/api/experiments/{experiment['id']}", headers=auth_headers)
    assert delete_experiment.status_code == 200


@pytest.mark.asyncio
async def test_planning_endpoints_return_values(client, auth_headers, seeded_experiment):
    experiment_id = seeded_experiment["experiment"]["id"]
    metric_id = seeded_experiment["metric"]["id"]

    sample_size_response = await client.post(
        f"/api/experiments/{experiment_id}/sample-size",
        params={"metric_id": metric_id, "alpha": 0.05, "power": 0.8, "effect_size": 0.05, "base_rate": 0.5},
        headers=auth_headers,
    )
    assert sample_size_response.status_code == 200
    assert sample_size_response.json()["sample_size"] > 0

    mde_response = await client.post(
        f"/api/experiments/{experiment_id}/mde",
        params={"metric_id": metric_id, "alpha": 0.05, "power": 0.8, "sample_size": 1200, "base_rate": 0.5},
        headers=auth_headers,
    )
    assert mde_response.status_code == 200
    assert mde_response.json()["minimum_detectable_effect"] > 0
