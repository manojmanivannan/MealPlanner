import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from models import Recipe, RecipeMealType


def test_add_list_update_delete_ingredient(test_client: TestClient, auth_headers):
    # Initially empty
    resp = test_client.get("/ingredients", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []

    # Add
    resp = test_client.post(
        "/ingredients",
        params={"name": "Tomato", "shelf_life": 5, "serving_unit": "g"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    ing = resp.json()

    # List
    resp = test_client.get("/ingredients", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "Tomato"

    # Update availability
    resp = test_client.put(f"/ingredients/{ing['id']}", params={"available": True}, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["available"] is True

    # Delete
    resp = test_client.delete(f"/ingredients/{ing['id']}", headers=auth_headers)
    assert resp.status_code == 204


def test_add_existing_ingredient(test_client: TestClient, auth_headers):
    # Add an ingredient
    test_client.post(
        "/ingredients",
        params={"name": "Onion", "shelf_life": 10, "serving_unit": "g"},
        headers=auth_headers,
    )
    # Try to add it again
    resp = test_client.post(
        "/ingredients",
        params={"name": "Onion", "shelf_life": 10, "serving_unit": "g"},
        headers=auth_headers,
    )
    assert resp.status_code == 409  # Bad Request or Conflict

def test_update_non_existent_ingredient(test_client: TestClient, auth_headers):
    resp = test_client.put("/ingredients/9999", params={"available": True}, headers=auth_headers)
    assert resp.status_code == 404

def test_delete_non_existent_ingredient(test_client: TestClient, auth_headers):
    resp = test_client.delete("/ingredients/9999", headers=auth_headers)
    assert resp.status_code == 404



def test_get_ingredient_unauthorized(test_client: TestClient):
    resp = test_client.get("/ingredients")
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Recipe sync on ingredient update (name / serving_unit / serving_size)
# ---------------------------------------------------------------------------

def _create_ingredient(client, headers, name, serving_unit, serving_size=None, extra=None):
    params = {"name": name, "shelf_life": 5, "serving_unit": serving_unit}
    if serving_size is not None:
        params["serving_size"] = serving_size
    resp = client.post("/ingredients", params=params, headers=headers)
    assert resp.status_code == 201, resp.text
    ing = resp.json()
    if extra:
        # Nutrition values are only settable via PUT (POST takes no nutrition params).
        resp = client.put(f"/ingredients/{ing['id']}", params=extra, headers=headers)
        assert resp.status_code == 200, resp.text
        ing = resp.json()
    return ing


def _create_recipe(client, headers, name, ingredients):
    payload = {
        "name": name,
        "serves": 2,
        "ingredients": ingredients,
        "instructions": "mix and cook",
        "meal_type": "lunch",
        "is_vegetarian": True,
    }
    resp = client.post("/recipes", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_add_ingredient_create_default_serving_size(test_client, auth_headers):
    # Create-time defaults: bulk units "per 100", everything else (including
    # cup) 1. Note the edit modal's unit-change prefill deliberately differs
    # for cup (240 ml) — it suggests a nutrition basis, not the create default.
    assert _create_ingredient(test_client, auth_headers, "Flour", "g")["serving_size"] == 100
    assert _create_ingredient(test_client, auth_headers, "Water", "ml")["serving_size"] == 100
    assert _create_ingredient(test_client, auth_headers, "Rice", "cup")["serving_size"] == 1
    assert _create_ingredient(test_client, auth_headers, "Eggs", "nos")["serving_size"] == 1


def _get_recipe_rows(client, headers, recipe_id):
    resp = client.get(f"/recipes/{recipe_id}", headers=headers)
    assert resp.status_code == 200, resp.text
    return resp.json()["ingredients"]


def test_rename_updates_recipe_rows_and_preserves_quantity(test_client, auth_headers):
    ing = _create_ingredient(test_client, auth_headers, "Almonds", "g")
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Almond Mix",
        [{"name": "almonds", "quantity": 80, "serving_unit": "g"}],  # lowercase name on purpose
    )

    resp = test_client.put(f"/ingredients/{ing['id']}", params={"name": "Almond Flakes"}, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["name"] == "Almond Flakes"

    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows == [{"name": "Almond Flakes", "quantity": 80, "serving_unit": "g"}]


def test_size_change_rescales_recipe_quantities(test_client, auth_headers):
    ing = _create_ingredient(
        test_client, auth_headers, "Sugar", "g", serving_size=100,
        extra={"protein": 10, "energy": 400},
    )
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Cake",
        [{"name": "Sugar", "quantity": 50, "serving_unit": "g"}],
    )
    # Nutrition per the trigger: protein 10 x 50 / 100 = 5
    before = test_client.get(f"/recipes/{recipe['id']}", headers=auth_headers).json()

    resp = test_client.put(f"/ingredients/{ing['id']}", params={"serving_size": 250}, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["serving_size"] == 250

    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    # Rescaled by new/old = 250/100 = x2.5, rounded to 4 decimals
    assert rows[0]["quantity"] == 125
    assert rows[0]["serving_unit"] == "g"

    # Nutrition preserved by construction: 10 x 125 / 250 = 5
    after = test_client.get(f"/recipes/{recipe['id']}", headers=auth_headers).json()
    assert after["protein"] == pytest.approx(before["protein"])
    assert after["energy"] == pytest.approx(before["energy"])
    assert before["protein"] == pytest.approx(5.0)


def test_unit_change_with_size_reentry_rescales(test_client, auth_headers):
    # Ginger g/100 -> nos/1: recipe rows 20 g -> 0.2 nos (x1/100); nutrition
    # is unchanged because the same ratio cancels in the trigger math.
    ing = _create_ingredient(
        test_client, auth_headers, "Ginger", "g", serving_size=100,
        extra={"protein": 5, "energy": 80},
    )
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Stir Fry",
        [{"name": "ginger", "quantity": 20, "serving_unit": "g"}],
    )
    before = test_client.get(f"/recipes/{recipe['id']}", headers=auth_headers).json()

    resp = test_client.put(
        f"/ingredients/{ing['id']}",
        params={"serving_unit": "nos", "serving_size": 1},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text

    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows[0]["serving_unit"] == "nos"
    assert rows[0]["quantity"] == pytest.approx(0.2)

    after = test_client.get(f"/recipes/{recipe['id']}", headers=auth_headers).json()
    assert after["protein"] == pytest.approx(before["protein"])
    assert after["energy"] == pytest.approx(before["energy"])


def test_unit_change_same_size_no_rescale(test_client, auth_headers):
    # g/100 -> ml/100: same size means no numeric change, only a relabel.
    ing = _create_ingredient(test_client, auth_headers, "Milk", "g", serving_size=100)
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Smoothie",
        [{"name": "Milk", "quantity": 250, "serving_unit": "g"}],
    )

    resp = test_client.put(
        f"/ingredients/{ing['id']}",
        params={"serving_unit": "ml", "serving_size": 100},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text

    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows[0]["serving_unit"] == "ml"
    assert rows[0]["quantity"] == 250


def test_unit_change_without_size_no_rescale(test_client, auth_headers):
    # Unit alone does nothing numeric: PUT with only serving_unit relabels.
    ing = _create_ingredient(test_client, auth_headers, "Almonds", "g")
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Almond Mix",
        [{"name": "Almonds", "quantity": 80, "serving_unit": "g"}],
    )

    resp = test_client.put(f"/ingredients/{ing['id']}", params={"serving_unit": "nos"}, headers=auth_headers)
    assert resp.status_code == 200, resp.text

    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows[0]["quantity"] == 80
    assert rows[0]["serving_unit"] == "nos"


def test_invalid_serving_size_rejected(test_client, auth_headers):
    ing = _create_ingredient(test_client, auth_headers, "Sugar", "g", serving_size=100)
    for bad in ("0", "-5", "", "abc", "nan", "inf", "1e999"):
        resp = test_client.put(f"/ingredients/{ing['id']}", params={"serving_size": bad}, headers=auth_headers)
        assert resp.status_code == 400, f"{bad!r}: {resp.text}"
        assert "positive number" in resp.json()["detail"]


def test_availability_only_update_still_works(test_client, auth_headers):
    # The pantry toggle PUTs only `available`; serving_size validation must
    # not reject it.
    ing = _create_ingredient(test_client, auth_headers, "Spinach", "g", serving_size=100)
    resp = test_client.put(f"/ingredients/{ing['id']}", params={"available": "true"}, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["available"] is True


def test_repeated_size_edits_compound_exactly(test_client, auth_headers):
    # 100 -> 50 -> 25 compounds to exactly x0.25 on the recipe row, with
    # stored values rounded to 8 decimal places.
    ing = _create_ingredient(test_client, auth_headers, "Oats", "g", serving_size=100)
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Porridge",
        [{"name": "Oats", "quantity": 7, "serving_unit": "g"}],
    )

    resp = test_client.put(f"/ingredients/{ing['id']}", params={"serving_size": 50}, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows[0]["quantity"] == pytest.approx(3.5)

    resp = test_client.put(f"/ingredients/{ing['id']}", params={"serving_size": 25}, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows[0]["quantity"] == pytest.approx(1.75)  # 7 x 0.25 exactly

    # Write-time rounding: a non-terminating ratio is truncated, but far
    # below display precision. old size is now 25, so the factor is 3/25 = 0.12.
    resp = test_client.put(f"/ingredients/{ing['id']}", params={"serving_size": 3}, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows[0]["quantity"] == pytest.approx(0.21)  # 1.75 x 3/25


def test_rescale_rounded_to_eight_decimals(test_client, auth_headers):
    # Write-time rounding is 8 decimals (#44): enough to keep drift far below
    # display precision, and it can no longer truncate a real quantity away.
    # 1 x (33.333/100) = 0.33333 exactly — 4-decimal storage used to keep
    # only 0.3333 (~0.09% drift, compounding across edits).
    ing = _create_ingredient(test_client, auth_headers, "Saffron", "g", serving_size=100)
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Paella",
        [{"name": "Saffron", "quantity": 1, "serving_unit": "g"}],
    )

    resp = test_client.put(f"/ingredients/{ing['id']}", params={"serving_size": 33.333}, headers=auth_headers)
    assert resp.status_code == 200, resp.text

    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows[0]["quantity"] == pytest.approx(0.33333)

    # A row whose ideal has a 9th decimal is truncated at the 8th:
    # 0.3333 x (33.333/100) = 0.111098889 -> stored 0.11109889.
    ing2 = _create_ingredient(test_client, auth_headers, "Sumac", "g", serving_size=100)
    recipe2 = _create_recipe(
        test_client,
        auth_headers,
        "Fattoush",
        [{"name": "Sumac", "quantity": 0.3333, "serving_unit": "g"}],
    )
    resp = test_client.put(f"/ingredients/{ing2['id']}", params={"serving_size": 33.333}, headers=auth_headers)
    assert resp.status_code == 200, resp.text

    rows = _get_recipe_rows(test_client, auth_headers, recipe2["id"])
    assert rows[0]["quantity"] == 0.11109889


def test_tiny_quantity_rescale_does_not_collapse_to_zero(test_client, auth_headers):
    # A 4 mg spice row downsized 100 -> 1 yields 0.00004. Rounding that to 4
    # decimals stored exactly 0.0, so the row contributed zero nutrition to
    # every recipe and showed 0 on the shopping list (#44). The stored
    # quantity must survive at 8-decimal precision and keep its nutrition.
    ing = _create_ingredient(
        test_client, auth_headers, "Cardamom", "g", serving_size=100,
        extra={"protein": 500},  # 0.02 protein in the 4 mg row
    )
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Chai",
        [{"name": "Cardamom", "quantity": 0.004, "serving_unit": "g"}],
    )
    before = test_client.get(f"/recipes/{recipe['id']}", headers=auth_headers).json()
    assert before["protein"] == pytest.approx(0.02)

    resp = test_client.put(f"/ingredients/{ing['id']}", params={"serving_size": 1}, headers=auth_headers)
    assert resp.status_code == 200, resp.text

    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows[0]["quantity"] == pytest.approx(0.00004)
    assert rows[0]["quantity"] != 0

    # Nutrition preserved by construction: 500 x 0.00004 / 1 = 0.02
    after = test_client.get(f"/recipes/{recipe['id']}", headers=auth_headers).json()
    assert after["protein"] == pytest.approx(before["protein"])


def test_repeated_size_edits_compounded_error_within_tolerance(test_client, auth_headers):
    # Each write rounds the stored quantity, so the error of one edit becomes
    # the input of the next. A 1 g row rescaled 100 -> 33.333 -> 66.666 ->
    # 12.345 -> 12.5 must land within 1e-6 of the ideal 1 x 12.5 / 100 = 0.125;
    # 4-decimal storage compounded to 0.1249 (a 1e-4 drift) on this chain (#44).
    ing = _create_ingredient(
        test_client, auth_headers, "Sumac", "g", serving_size=100,
        extra={"protein": 100},
    )
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Fattoush",
        [{"name": "Sumac", "quantity": 1, "serving_unit": "g"}],
    )
    before = test_client.get(f"/recipes/{recipe['id']}", headers=auth_headers).json()
    assert before["protein"] == pytest.approx(1.0)

    for size in (33.333, 66.666, 12.345, 12.5):
        resp = test_client.put(f"/ingredients/{ing['id']}", params={"serving_size": size}, headers=auth_headers)
        assert resp.status_code == 200, resp.text

    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows[0]["quantity"] == pytest.approx(0.125, abs=1e-6)

    # Nutrition drifts by the same compounded factor, so it must stay whole.
    after = test_client.get(f"/recipes/{recipe['id']}", headers=auth_headers).json()
    assert after["protein"] == pytest.approx(before["protein"], abs=1e-4)


def test_size_change_rescales_global_recipe_too(test_client, auth_headers, db_session):
    # Global recipes (user_id NULL) must be rescaled as well.
    ing = _create_ingredient(test_client, auth_headers, "Salt", "g", serving_size=100)
    global_recipe = Recipe(
        name="Brine",
        serves=2,
        ingredients=[{"name": "salt", "quantity": 10, "serving_unit": "g"}],
        instructions="dissolve",
        meal_type=RecipeMealType.lunch,
        is_vegetarian=True,
        user_id=None,
    )
    db_session.add(global_recipe)
    db_session.commit()

    resp = test_client.put(f"/ingredients/{ing['id']}", params={"serving_size": 200}, headers=auth_headers)
    assert resp.status_code == 200, resp.text

    db_session.expire_all()
    rows = global_recipe.ingredients
    assert rows[0]["quantity"] == pytest.approx(20)
    assert rows[0]["serving_unit"] == "g"


def _corrupt_serving_size(db_session, ingredient_id, value):
    # Simulate a legacy row (or a row written before validation existed):
    # the ORM default only applies on inserts, so the column can hold
    # NULL or 0 (#43).
    db_session.execute(
        text("UPDATE ingredients SET serving_size = :v WHERE id = :i"),
        {"v": value, "i": ingredient_id},
    )
    db_session.commit()
    db_session.expire_all()


@pytest.mark.parametrize("legacy_size", [None, 0, -5])
def test_size_change_with_legacy_old_size_rejected_when_recipes_reference_it(
    test_client, auth_headers, db_session, legacy_size
):
    ing = _create_ingredient(test_client, auth_headers, "Sugar", "g", serving_size=100)
    _corrupt_serving_size(db_session, ing["id"], legacy_size)
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Cake",
        [{"name": "Sugar", "quantity": 50, "serving_unit": "g"}],
    )

    resp = test_client.put(f"/ingredients/{ing['id']}", params={"serving_size": 240}, headers=auth_headers)

    # Rejected: there is no usable old size to rescale from, and silently
    # skipping the rescale while storing the new size corrupts nutrition.
    assert resp.status_code == 400, resp.text
    assert "Cake" in resp.json()["detail"]

    # Nothing was written: the recipe row and the stored size are untouched.
    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows[0]["quantity"] == 50
    # Asserted at the DB level to prove nothing was written by the rejected
    # PUT (the API response is a 400 with no body to inspect).
    from models import Ingredient
    stored = db_session.query(Ingredient).get(ing["id"])
    assert stored.serving_size == legacy_size


def test_size_change_with_legacy_old_size_allowed_without_recipe_rows(test_client, auth_headers, db_session):
    # No recipe references the ingredient, so there is nothing to rescale —
    # the PUT is the only way to repair the legacy NULL, so it must succeed.
    ing = _create_ingredient(test_client, auth_headers, "Quinoa", "g", serving_size=100)
    _corrupt_serving_size(db_session, ing["id"], None)

    resp = test_client.put(f"/ingredients/{ing['id']}", params={"serving_size": 240}, headers=auth_headers)

    assert resp.status_code == 200, resp.text
    assert resp.json()["serving_size"] == 240


def test_unit_change_with_legacy_old_size_still_propagates(test_client, auth_headers, db_session):
    # Rename/unit propagation does not need the old size — only a size
    # change does — so it must not be blocked by the legacy-size rejection.
    ing = _create_ingredient(test_client, auth_headers, "Millet", "g", serving_size=100)
    _corrupt_serving_size(db_session, ing["id"], None)
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Porridge",
        [{"name": "Millet", "quantity": 40, "serving_unit": "g"}],
    )

    resp = test_client.put(
        f"/ingredients/{ing['id']}",
        params={"name": "Hulled Millet", "serving_unit": "tsp"},
        headers=auth_headers,
    )

    assert resp.status_code == 200, resp.text
    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows[0]["name"] == "Hulled Millet"
    assert rows[0]["quantity"] == 40
    assert rows[0]["serving_unit"] == "tsp"


def test_noop_resave_does_not_rescale_recipe_quantities(test_client, auth_headers):
    # The edit UI re-sends the current name/unit on every save; a no-op save
    # must leave recipe quantities untouched (old code multiplied x100 here).
    ing = _create_ingredient(test_client, auth_headers, "Honey", "g")
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Granola",
        [{"name": "Honey", "quantity": 30, "serving_unit": "g"}],
    )

    resp = test_client.put(
        f"/ingredients/{ing['id']}",
        params={"name": "Honey", "serving_unit": "g", "serving_size": 100},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text

    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows == [{"name": "Honey", "quantity": 30, "serving_unit": "g"}]


def test_rename_and_unit_change_together(test_client, auth_headers):
    ing = _create_ingredient(test_client, auth_headers, "Wheat Flour", "cup")
    recipe = _create_recipe(
        test_client,
        auth_headers,
        "Bread",
        [{"name": "Wheat Flour", "quantity": 1, "serving_unit": "cup"}],
    )

    # Unit and size re-entry arrive in the same request; the factor is
    # computed from the DB's old size (cup defaults to 1), not a volume table.
    resp = test_client.put(
        f"/ingredients/{ing['id']}",
        params={"name": "Whole Wheat Flour", "serving_unit": "tbsp", "serving_size": 16},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text

    rows = _get_recipe_rows(test_client, auth_headers, recipe["id"])
    assert rows[0]["name"] == "Whole Wheat Flour"
    assert rows[0]["serving_unit"] == "tbsp"
    # 1 cup x (16 / 1) = 16 tbsp — the size ratio, not a unit conversion.
    assert rows[0]["quantity"] == 16


def test_automatic_ingredient_expiration(test_client: TestClient, auth_headers, db_session):
    import datetime
    from models import Ingredient

    # 1. Add ingredient
    resp = test_client.post(
        "/ingredients",
        params={"name": "Lettuce", "shelf_life": 2, "serving_unit": "g"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    ing = resp.json()
    ing_id = ing["id"]

    # 2. Update to available (this sets last_available to utcnow)
    resp = test_client.put(
        f"/ingredients/{ing_id}",
        params={"available": True},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["available"] is True

    # 3. Modify last_available in database to be 3 days in the past (expired)
    db_ing = db_session.query(Ingredient).filter(Ingredient.id == ing_id).first()
    assert db_ing is not None
    # We use timezone-aware or naive based on how it's defined. Let's make sure it works with database.
    # Postgres uses TIMESTAMP (without tz) or TIMESTAMPTZ. 
    # Let's set db_ing.last_available to a naive datetime since database column is TIMESTAMP.
    db_ing.last_available = datetime.datetime.utcnow() - datetime.timedelta(days=3)
    db_session.commit()

    # 4. Access endpoint (which triggers get_current_user and thus our expiration logic)
    resp = test_client.get("/ingredients", headers=auth_headers)
    assert resp.status_code == 200

    # 5. Check response to verify it's marked unavailable
    ingredients = resp.json()
    lettuce = next(i for i in ingredients if i["id"] == ing_id)
    assert lettuce["available"] is False


# ---------------------------------------------------------------------------
# Cleared / omitted nutrition fields on PUT (#41)
#
# The edit modal sends every nutrition field on every save; a cleared one
# arrives as an empty string. `Optional[float]` 422s that before the handler
# runs, and even if it didn't, every setter was `if x is not None`, so there
# was no way to unset a nutrition value at all. The contract:
#   • omitted param  → leave the stored value untouched
#   • empty string   → clear the stored value to NULL
#   • non-numeric    → 400 with the field named
# ---------------------------------------------------------------------------

def test_cleared_nutrition_field_becomes_null(test_client, auth_headers):
    ing = _create_ingredient(test_client, auth_headers, "Peanut Butter", "g", serving_size=100)
    resp = test_client.put(
        f"/ingredients/{ing['id']}", params={"energy": 588, "protein": 25}, headers=auth_headers
    )
    assert resp.status_code == 200, resp.text

    # Clearing: empty string → NULL, echoed back as null in the response.
    resp = test_client.put(
        f"/ingredients/{ing['id']}", params={"energy": "", "protein": ""}, headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["energy"] is None
    assert body["protein"] is None

    # The cleared state round-trips through the list schema.
    listed = test_client.get("/ingredients", headers=auth_headers).json()
    row = next(i for i in listed if i["id"] == ing["id"])
    assert row["energy"] is None
    assert row["protein"] is None


def test_edit_modal_payload_with_mixed_cleared_fields_saves(test_client, auth_headers):
    # The full edit-modal payload: macros filled, minerals cleared. The
    # cleared ones must not 422 the whole save.
    ing = _create_ingredient(test_client, auth_headers, "Chia", "g", serving_size=100)
    params = {"name": "Chia Seeds", "serving_unit": "g", "serving_size": 100}
    nutrition_keys = (
        "energy", "protein", "carbs", "fat", "fiber",
        "iron_mg", "magnesium_mg", "calcium_mg", "potassium_mg", "sodium_mg", "vitamin_c_mg",
    )
    for key in nutrition_keys:
        params[key] = "486" if key == "energy" else ""
    resp = test_client.put(f"/ingredients/{ing['id']}", params=params, headers=auth_headers)
    assert resp.status_code == 200, resp.text

    body = resp.json()
    assert body["energy"] == 486
    for key in ("protein", "iron_mg", "vitamin_c_mg"):
        assert body[key] is None


def test_omitted_nutrition_fields_left_untouched(test_client, auth_headers):
    # A partial update (the pantry toggle PUTs only `available`) must neither
    # clear nor change stored nutrition.
    ing = _create_ingredient(test_client, auth_headers, "Tofu", "g", serving_size=100)
    resp = test_client.put(f"/ingredients/{ing['id']}", params={"protein": 8}, headers=auth_headers)
    assert resp.status_code == 200, resp.text

    resp = test_client.put(f"/ingredients/{ing['id']}", params={"available": "true"}, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["protein"] == 8


def test_invalid_nutrition_value_rejected(test_client, auth_headers):
    ing = _create_ingredient(test_client, auth_headers, "Olive Oil", "g", serving_size=100)
    for bad in ("abc", "nan", "inf", "1e999"):
        resp = test_client.put(f"/ingredients/{ing['id']}", params={"energy": bad}, headers=auth_headers)
        assert resp.status_code == 400, f"{bad!r}: {resp.text}"
        assert "energy" in resp.json()["detail"].lower()


def test_recipe_nutrition_tolerates_null_ingredient_nutrient(test_client, auth_headers):
    # A cleared (NULL) nutrient must contribute 0 to recipe nutrition. The
    # trigger adds per-row contributions, and plpgsql addition propagates
    # NULL — without a COALESCE, one cleared field NULLs the recipe's totals.
    ing = _create_ingredient(test_client, auth_headers, "Cocoa", "g", serving_size=100)
    test_client.put(f"/ingredients/{ing['id']}", params={"energy": 228}, headers=auth_headers)
    recipe = _create_recipe(
        test_client, auth_headers, "Hot Cocoa", [{"name": "Cocoa", "quantity": 50, "serving_unit": "g"}]
    )
    # 228 kcal/100g x 50 g / 100 = 114
    assert test_client.get(f"/recipes/{recipe['id']}", headers=auth_headers).json()["energy"] == pytest.approx(114)

    # Clear energy to NULL, then create a fresh recipe so the trigger
    # recomputes from the cleared value.
    resp = test_client.put(f"/ingredients/{ing['id']}", params={"energy": ""}, headers=auth_headers)
    assert resp.status_code == 200, resp.text

    recipe2 = _create_recipe(
        test_client, auth_headers, "Hot Cocoa 2", [{"name": "Cocoa", "quantity": 50, "serving_unit": "g"}]
    )
    after = test_client.get(f"/recipes/{recipe2['id']}", headers=auth_headers).json()
    assert after["energy"] == pytest.approx(0)



