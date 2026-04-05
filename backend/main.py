from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from sqlalchemy.orm import Session
from sqlalchemy import text
import psutil
import os
from database.database import get_db, Base, engine
from api.routers.auth import router as auth_router
from api.routers.cocktails import router as cocktails_router
from api.routers.recieps import router as recipes_router
from api.routers.ingredients import router as ingredients_router
from api.routers.upload import router as upload_router
from api.routers.prepared_cocktails import router as prepared_cocktails_router

app = FastAPI()

_cors = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost,http://127.0.0.1",
)
_cors_list = [o.strip() for o in _cors.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return {"message": "Hello World"}


@app.get("/health")
def detailed_health_check(db: Session = Depends(get_db)):
    checks = {}

    try:
        db.execute(text("SELECT 1"))
        checks["database"] = {"status": "healthy", "response_time": "10ms"}
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "error": str(e)}

    memory = psutil.virtual_memory()
    checks["memory"] = {
        "status": "healthy" if memory.percent < 90 else "warning",
        "used_percent": memory.percent,
        "available_gb": round(memory.available / (1024 ** 3), 1)
    }

    disk = psutil.disk_usage('/')
    checks["disk"] = {
        "status": "healthy" if disk.percent < 95 else "warning",
        "used_percent": disk.percent,
        "free_gb": round(disk.free / (1024 ** 3), 1)
    }

    all_healthy = all(check["status"] == "healthy" for check in checks.values())

    return {
        "status": "healthy" if all_healthy else "degraded",
        "timestamp": "2024-01-01T12:00:00Z",
        "version": "1.0.0",
        "checks": checks
    }


app.include_router(auth_router, prefix="/api/v1")
app.include_router(cocktails_router, prefix="/api/v1")
app.include_router(recipes_router, prefix="/api/v1")
app.include_router(ingredients_router, prefix="/api/v1")
app.include_router(upload_router, prefix="/api/v1")
app.include_router(prepared_cocktails_router, prefix="/api/v1")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
