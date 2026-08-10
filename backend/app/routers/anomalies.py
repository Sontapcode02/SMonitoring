from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_anomalies_stub():
    return {"message": "Anomalies endpoint stub ready", "data": []}
