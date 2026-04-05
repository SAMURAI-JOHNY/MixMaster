import json
import os
from xml.etree import ElementTree as ET

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy.orm import Session

from crud import cocktails as crud_cocktail
from database.database import get_db

router = APIRouter(tags=["seo"])
structured_router = APIRouter(prefix="/api/v1/seo", tags=["seo"])


def _public_site_url() -> str:
    return os.getenv("PUBLIC_SITE_URL", "http://localhost:8080").rstrip("/")


@router.get("/sitemap.xml")
def sitemap_xml(db: Session = Depends(get_db)) -> Response:
    base = _public_site_url()
    urlset = ET.Element(
        "{http://www.sitemaps.org/schemas/sitemap/0.9}urlset",
    )

    def add_url(loc: str, changefreq: str, priority: str) -> None:
        url_el = ET.SubElement(urlset, "{http://www.sitemaps.org/schemas/sitemap/0.9}url")
        loc_el = ET.SubElement(url_el, "{http://www.sitemaps.org/schemas/sitemap/0.9}loc")
        loc_el.text = loc
        cf = ET.SubElement(url_el, "{http://www.sitemaps.org/schemas/sitemap/0.9}changefreq")
        cf.text = changefreq
        pr = ET.SubElement(url_el, "{http://www.sitemaps.org/schemas/sitemap/0.9}priority")
        pr.text = priority

    add_url(f"{base}/", "daily", "1.0")
    for cid in crud_cocktail.get_all_cocktail_ids(db):
        add_url(f"{base}/recipe/{cid}", "weekly", "0.9")

    body = ET.tostring(urlset, encoding="utf-8", xml_declaration=True)
    return Response(content=body, media_type="application/xml")


@router.get("/robots.txt", response_class=PlainTextResponse)
def robots_txt() -> str:
    base = _public_site_url()
    return (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /my-prepared\n"
        "Disallow: /create-recipe\n"
        "Disallow: /edit-cocktail/\n"
        "Disallow: /edit-recipe/\n"
        "Disallow: /ingredients\n"
        "Disallow: /api/\n"
        "\n"
        f"Sitemap: {base}/sitemap.xml\n"
    )


@structured_router.get("/recipe/{cocktail_id}/json-ld")
def recipe_json_ld(cocktail_id: int, db: Session = Depends(get_db)) -> Response:
    cocktail = crud_cocktail.get_cocktail(db, cocktail_id)
    if cocktail is None:
        raise HTTPException(status_code=404, detail="Cocktail not found")

    base = _public_site_url()
    page_url = f"{base}/recipe/{cocktail_id}"
    doc: dict = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        "name": cocktail.name,
        "description": (cocktail.description or cocktail.instructions or "")[:2000],
        "url": page_url,
    }
    if cocktail.category:
        doc["recipeCategory"] = cocktail.category
    img = cocktail.image_url
    if isinstance(img, str) and img.startswith(("http://", "https://")):
        doc["image"] = [img]

    payload = json.dumps(doc, ensure_ascii=False)
    return Response(content=payload, media_type="application/ld+json")
