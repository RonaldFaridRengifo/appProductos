import io
import os
import shutil
from fastapi.testclient import TestClient
from PIL import Image

# Use a test database
os.environ["DATABASE_PATH"] = "data/test_app.db"
os.environ["UPLOADS_DIR"] = "test_uploads"

from app.main import app
from app.database import Base, engine, SessionLocal
from app.seed import seed
from app.models import Category, Product, User

client = TestClient(app)

def test_full_flow():
    # Reset database schema for isolated test
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed(db)

    # 1. Login with initial Admin credentials
    res = client.post("/api/auth/login", json={"username": "Admin", "password": "Admin"})
    assert res.status_code == 200, res.text
    data = res.json()
    token = data["token"]
    user = data["user"]
    assert user["must_setup"] is True
    assert user["role"] == "admin"
    admin_auth = {"Authorization": f"Bearer {token}"}

    # Before setup, admin cannot perform admin actions
    cat_res = client.post("/api/admin/categories", json={"name": "Pizzas"}, headers=admin_auth)
    assert cat_res.status_code == 403, "Should reject before completing setup"

    # 2. Complete setup
    setup_res = client.post("/api/auth/setup", json={
        "username": "SuperAdmin",
        "password": "Password123!",
        "email": "admin@example.com",
        "name": "Administrador Principal"
    }, headers=admin_auth)
    assert setup_res.status_code == 200, setup_res.text
    new_token = setup_res.json()["token"]
    admin_auth = {"Authorization": f"Bearer {new_token}"}

    # Verify old login fails
    old_login = client.post("/api/auth/login", json={"username": "Admin", "password": "Admin"})
    assert old_login.status_code == 401

    # Verify new login succeeds
    new_login = client.post("/api/auth/login", json={"username": "SuperAdmin", "password": "Password123!"})
    assert new_login.status_code == 200
    assert new_login.json()["user"]["must_setup"] is False

    # 3. Admin cannot delete himself
    me = client.get("/api/auth/me", headers=admin_auth).json()
    del_self = client.delete(f"/api/admin/users/{me['id']}", headers=admin_auth)
    assert del_self.status_code == 400
    assert "El administrador no puede eliminarse a sí mismo" in del_self.json()["detail"]

    # 4. Manage Collaborators
    collab_res = client.post("/api/admin/users", json={
        "name": "Juan Pérez",
        "username": "juanito",
        "password": "CollabPassword123"
    }, headers=admin_auth)
    assert collab_res.status_code == 200, collab_res.text
    collab = collab_res.json()
    assert collab["role"] == "collaborator"

    # Login as collaborator
    collab_login = client.post("/api/auth/login", json={"username": "juanito", "password": "CollabPassword123"})
    assert collab_login.status_code == 200
    collab_auth = {"Authorization": f"Bearer {collab_login.json()['token']}"}

    # Collaborator CANNOT create categories
    collab_cat = client.post("/api/admin/categories", json={"name": "Hacking Cat"}, headers=collab_auth)
    assert collab_cat.status_code == 403

    # Collaborator CANNOT manage home
    collab_home = client.post("/api/admin/home", json={"title": "Hacked", "image_side": "left", "card_size": "md", "image_size": "md"}, headers=collab_auth)
    assert collab_home.status_code == 403

    # Collaborator CANNOT manage locations
    collab_loc = client.post("/api/admin/locations", json={"name": "Fake", "location_type": "presencial"}, headers=collab_auth)
    assert collab_loc.status_code == 403

    # Collaborator CANNOT manage appearance / settings
    collab_set = client.put("/api/admin/settings", json={
        "company_name": "Hack",
        "header_color": "#000000",
        "background_color": "#ffffff",
        "contact_email": "a@a.com"
    }, headers=collab_auth)
    assert collab_set.status_code == 403

    # 5. Admin creates Category
    cat1_res = client.post("/api/admin/categories", json={"name": "Bebidas", "sort_order": 1}, headers=admin_auth)
    assert cat1_res.status_code == 200
    cat1 = cat1_res.json()

    # Collaborator CAN list categories
    cats_list = client.get("/api/admin/categories", headers=collab_auth)
    assert cats_list.status_code == 200
    assert any(c["id"] == cat1["id"] for c in cats_list.json())

    # Collaborator CAN create product in that category
    prod1_res = client.post("/api/admin/products", json={
        "category_id": cat1["id"],
        "title": "Jugo Natural",
        "description": "Jugo de naranja natural 100% fruta.",
        "price": 8000.0,
        "discount_enabled": False,
        "sort_order": 1
    }, headers=collab_auth)
    assert prod1_res.status_code == 200, prod1_res.text
    prod1 = prod1_res.json()
    assert prod1["price"] == 8000.0
    assert prod1["discount_enabled"] is False

    # Check public catalog
    public_cat = client.get("/api/public/catalog").json()
    found_prod = None
    for c in public_cat:
        for p in c["products"]:
            if p["id"] == prod1["id"]:
                found_prod = p
    assert found_prod is not None
    assert found_prod["price"] == 8000.0
    assert found_prod["current_price"] == 8000.0
    assert found_prod["discount_enabled"] is False
    assert found_prod["discount_price"] is None

    # Collaborator activates discount on product
    update_prod = client.put(f"/api/admin/products/{prod1['id']}", json={
        "category_id": cat1["id"],
        "title": "Jugo Natural",
        "description": "Jugo de naranja natural 100% fruta.",
        "price": 8000.0,
        "discount_enabled": True,
        "discount_price": 6000.0,
        "sort_order": 1
    }, headers=collab_auth)
    assert update_prod.status_code == 200

    # Public catalog now shows discount price 6000 and old price 8000
    public_cat = client.get("/api/public/catalog").json()
    for c in public_cat:
        for p in c["products"]:
            if p["id"] == prod1["id"]:
                assert p["discount_enabled"] is True
                assert p["price"] == 8000.0
                assert p["current_price"] == 6000.0
                assert p["discount_price"] == 6000.0

    # Deactivate discount: price should be 8000 in public, but saved discount price kept in db
    deact_prod = client.put(f"/api/admin/products/{prod1['id']}", json={
        "category_id": cat1["id"],
        "title": "Jugo Natural",
        "description": "Jugo de naranja natural 100% fruta.",
        "price": 8000.0,
        "discount_enabled": False,
        "sort_order": 1
    }, headers=collab_auth)
    assert deact_prod.status_code == 200

    # In public, discount is hidden
    public_cat = client.get("/api/public/catalog").json()
    for c in public_cat:
        for p in c["products"]:
            if p["id"] == prod1["id"]:
                assert p["discount_enabled"] is False
                assert p["current_price"] == 8000.0
                assert p["discount_price"] is None

    # In admin, discount_price was retained (6000.0)
    admin_prod = client.get("/api/admin/products", headers=admin_auth).json()
    for p in admin_prod:
        if p["id"] == prod1["id"]:
            assert p["discount_price"] == 6000.0

    # 6. Delete category cascades to delete its products
    del_cat = client.delete(f"/api/admin/categories/{cat1['id']}", headers=admin_auth)
    assert del_cat.status_code == 200
    # Verify product is gone
    prod_check = client.get("/api/admin/products", headers=admin_auth).json()
    assert not any(p["id"] == prod1["id"] for p in prod_check)

    # 7. Locations test
    # Presencial
    loc_pres = client.post("/api/admin/locations", json={
        "name": "Sede Principal Centro",
        "address": "Calle 10 # 4-20",
        "location_type": "presencial",
        "hours_week_open": "08:00",
        "hours_week_close": "20:00",
        "hours_sunday_open": "10:00",
        "hours_sunday_close": "16:00",
        "how_to_arrive_url": "https://maps.google.com/?q=Calle+10"
    }, headers=admin_auth)
    assert loc_pres.status_code == 200

    # Virtual
    loc_virt = client.post("/api/admin/locations", json={
        "name": "Sede Virtual Domicilios",
        "location_type": "virtual",
        "virtual_weekday_morning": "07:00 - 11:30",
        "virtual_weekday_afternoon": "12:00 - 22:00",
        "virtual_weekend": "08:00 - 23:00",
        "delivery_enabled": True,
        "delivery_name": "Didi Food",
        "delivery_desktop_url": "https://www.didifood.com",
        "delivery_mobile_deep_link": "didifood://store/12345",
        "delivery_store_url": "https://play.google.com/store/apps/details?id=com.didifood"
    }, headers=admin_auth)
    assert loc_virt.status_code == 200

    # Public locations
    pub_locs = client.get("/api/public/locations").json()
    assert len(pub_locs) >= 2
    virt_found = next(l for l in pub_locs if l["location_type"] == "virtual")
    assert virt_found["delivery_enabled"] is True
    assert virt_found["virtual_weekday_morning"] == "07:00 - 11:30"

    # 8. Contact form
    contact_res = client.post("/api/contact", json={
        "name": "Carlos Gomez",
        "email": "carlos@example.com",
        "message": "Felicitaciones por la excelente atención."
    })
    # If contact_email is not configured, check what happens
    print("Contact response:", contact_res.status_code, contact_res.text)

    # 9. Home Cards
    card_res = client.post("/api/admin/home", json={
        "title": "Nuestra Historia",
        "description": "Tradición desde 1995.",
        "image_side": "right",
        "card_size": "lg",
        "image_size": "md",
        "sort_order": 1
    }, headers=admin_auth)
    assert card_res.status_code == 200
    card = card_res.json()
    assert card["image_side"] == "right"
    assert card["card_size"] == "lg"

    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_full_flow()
