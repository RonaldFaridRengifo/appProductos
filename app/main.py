from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.routers import auth, categories, contact, home, locations, products, public, settings as settings_router, users
from app.security import ensure_dirs
from app.seed import seed

ensure_dirs()
Base.metadata.create_all(bind=engine)
with SessionLocal() as db:
    seed(db)

app = FastAPI(title="Catálogo de productos")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(public.router)
app.include_router(settings_router.router)
app.include_router(home.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(locations.router)
app.include_router(users.router)
app.include_router(contact.router)

STATIC_DIR = Path(__file__).parent / "static"
UPLOADS_DIR = Path(settings.uploads_dir)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


@app.get("/{full_path:path}")
def spa(full_path: str):
    if full_path.startswith("api"):
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Not found")
    index = STATIC_DIR / "index.html"
    return FileResponse(index)
