from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_alerts_stub():
    return {"message": "Alerts endpoint stub ready", "data": []}
