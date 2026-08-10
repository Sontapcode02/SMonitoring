from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_ml_stub():
    return {"message": "ML Isolation Forest endpoint stub ready", "status": "idle"}
