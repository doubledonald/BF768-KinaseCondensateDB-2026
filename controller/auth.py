from flask import Blueprint, request
from config import Config
from sqlalchemy.exc import IntegrityError
from exts import db
from models import UserInfo
from service.utils import ok, fail, make_token, model_to_dict, hash_password, verify_password, is_hashed_password

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.post('/login')
def login():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = data.get('password')
    role = (data.get('role') or '').strip().lower()

    if not username or not password:
        return fail('Username and password are required')

    if role and role not in {'user', 'admin'}:
        return fail('Invalid role value')

    query = UserInfo.query.filter(UserInfo.username == username)
    user = query.filter_by(role=role).first() if role else query.first()

    if not user: return fail('Username, password or role is incorrect')
    if user.status != 1:
        return fail('This account is disabled')
    if not verify_password(password, user.password):
        return fail('Username, password or role is incorrect')
    if not is_hashed_password(user.password):
        user.password = hash_password(password)
        db.session.commit()
    return ok({'token': make_token(user), 'user': model_to_dict(user, exclude={'password'})})

@auth_bp.post('/register')
def register():
    if not Config.ALLOW_PUBLIC_REGISTRATION:
        return fail('Public registration is disabled')
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    raw_password = (data.get('password') or '').strip()

    if not username or not raw_password:
        return fail('Username and password are required')
    if UserInfo.query.filter_by(username=username).first(): return fail('Username already exists')

    email = (data.get('email') or '').strip() or None
    if email and UserInfo.query.filter_by(email=email).first():
        return fail('Email already exists')

    if len(raw_password) < 8:
        return fail('Password should be at least 8 characters')

    user = UserInfo(
        username=username,
        password=hash_password(raw_password),
        gender=(data.get('gender') or '').strip() or None,
        phone=(data.get('phone') or '').strip() or None,
        email=email,
        role='user',
        status=1
    )
    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return fail('User creation failed due to duplicate or invalid input')
    return ok(msg='Registration successful')
