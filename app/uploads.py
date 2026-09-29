from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image

from app.config import settings

ALLOWED_IMAGE_TYPES = {
    "image/png": ".png",
    "image/x-png": ".png",
    "image/jpeg": ".jpg",
    "image/pjpeg": ".jpg",
    "image/webp": ".webp",
}


def save_image(file: UploadFile, subdir: str, filename_stem: str) -> str:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Debe seleccionar un archivo.")

    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Solo se permiten imágenes PNG, JPG o WEBP.",
        )

    data = file.file.read()
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status_code=400, detail="La imagen no puede superar 5 MB.")

    ext = ALLOWED_IMAGE_TYPES[content_type]
    target_dir = Path(settings.uploads_dir) / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / f"{filename_stem}{ext}"

    tmp = target.with_suffix(target.suffix + ".tmp")
    tmp.write_bytes(data)
    try:
        with Image.open(tmp) as img:
            img.verify()
    except Exception as exc:
        tmp.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="El archivo no es una imagen válida.") from exc

    tmp.replace(target)
    return f"/uploads/{subdir}/{target.name}"
