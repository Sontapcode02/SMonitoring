from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.dependencies import get_current_user, require_roles
from app.models.schemas import (
    UserModel, UserLogin, UserCreate, UserResponse, RoleUpdate, TokenResponse
)

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Xác thực tên đăng nhập & mật khẩu, trả về JWT token và thông tin người dùng."""
    user = db.query(UserModel).filter(UserModel.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản này đã bị khóa hoặc tạm dừng hoạt động.",
        )
    
    if user.expires_at and user.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản này đã hết hạn sử dụng. Vui lòng liên hệ Admin.",
        )
    
    # Generate Access Token with User ID and Role in payload
    token_payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role
    }
    access_token = create_access_token(data=token_payload)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: UserModel = Depends(get_current_user)):
    """Lấy thông tin cá nhân của tài khoản đang đăng nhập."""
    return UserResponse.model_validate(current_user)

@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin_user: UserModel = Depends(require_roles(["admin"]))
):
    """Lấy danh sách tất cả các tài khoản người dùng trong hệ thống (Chỉ dành cho Admin)."""
    users = db.query(UserModel).order_by(UserModel.id.asc()).all()
    return [UserResponse.model_validate(u) for u in users]

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    admin_user: UserModel = Depends(require_roles(["admin"]))
):
    """Tạo tài khoản mới với vai trò chỉ định và ngày hết hạn tùy chọn (Chỉ dành cho Admin)."""
    # Check existing username
    existing_username = db.query(UserModel).filter(UserModel.username == user_in.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tên đăng nhập '{user_in.username}' đã tồn tại trong hệ thống."
        )
    
    # Check existing email if provided
    if user_in.email:
        existing_email = db.query(UserModel).filter(UserModel.email == user_in.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{user_in.email}' đã được đăng ký."
            )
    
    # Check valid role
    valid_roles = ["admin", "operator", "viewer"]
    if user_in.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vai trò không hợp lệ. Chỉ chấp nhận các cấp: {', '.join(valid_roles)}"
        )
    
    # Calculate account expiration date
    expires_at = None
    if user_in.expires_in_days is not None and user_in.expires_in_days > 0:
        expires_at = datetime.utcnow() + timedelta(days=user_in.expires_in_days)
    elif user_in.expires_at is not None:
        expires_at = user_in.expires_at
    
    new_user = UserModel(
        username=user_in.username,
        email=user_in.email or None,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name or "",
        role=user_in.role,
        is_active=True,
        expires_at=expires_at
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserResponse.model_validate(new_user)

@router.put("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    role_in: RoleUpdate,
    db: Session = Depends(get_db),
    admin_user: UserModel = Depends(require_roles(["admin"]))
):
    """Cập nhật phân quyền (Role) cho tài khoản (Chỉ dành cho Admin)."""
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản.")
    
    # Ràng buộc bảo vệ tài khoản Admin hệ thống không bị thay đổi role
    if user.username == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản Admin gốc hệ thống ('admin') không thể bị thay đổi vai trò."
        )
    
    # Đảm bảo không bị mất tài khoản Admin duy nhất khi hạ quyền
    if user.role == "admin" and role_in.role != "admin":
        admin_count = db.query(UserModel).filter(UserModel.role == "admin", UserModel.is_active == True).count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể hạ quyền tài khoản Admin duy nhất đang hoạt động trong hệ thống."
            )
    
    valid_roles = ["admin", "operator", "viewer"]
    if role_in.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vai trò không hợp lệ. Chỉ chấp nhận các cấp: {', '.join(valid_roles)}"
        )
    
    user.role = role_in.role
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)

@router.delete("/users/{user_id}")
def toggle_user_active_status(
    user_id: int,
    db: Session = Depends(get_db),
    admin_user: UserModel = Depends(require_roles(["admin"]))
):
    """Khóa/Mở khóa trạng thái hoạt động của tài khoản (Chỉ dành cho Admin)."""
    if admin_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tự khóa tài khoản Admin đang đăng nhập."
        )
    
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản.")
    
    # Ràng buộc bảo vệ tài khoản Admin hệ thống không bị khóa
    if user.username == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản Admin gốc hệ thống ('admin') không thể bị vô hiệu hóa."
        )
    
    user.is_active = not user.is_active
    db.commit()
    status_str = "kích hoạt" if user.is_active else "vô hiệu hóa"
    return {"message": f"Tài khoản {user.username} đã được {status_str} thành công.", "is_active": user.is_active}
