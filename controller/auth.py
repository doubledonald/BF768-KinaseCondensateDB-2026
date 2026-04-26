from flask import Blueprint, request
from exts import db
from models import UserInfo
from service.utils import ok, fail, make_token, model_to_dict

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.post('/login')
def login():
    data = request.get_json() or {}
    username, password, role = data.get('username'), data.get('password'), data.get('role')
    if not username or not password or not role: return fail('Username, password and role are required')
    user = UserInfo.query.filter_by(username=username, password=password, role=role).first()
    if not user: return fail('Username, password or role is incorrect')
    if user.status != 1: return fail('This account is disabled')
    return ok({'token': make_token(user), 'user': model_to_dict(user, exclude={'password'})})

@auth_bp.post('/register')
def register():
    data = request.get_json() or {}
    if not data.get('username') or not data.get('password'): return fail('Username and password are required')
    if UserInfo.query.filter_by(username=data['username']).first(): return fail('Username already exists')
    if data.get('email') and UserInfo.query.filter_by(email=data['email']).first(): return fail('Email already exists')
    user = UserInfo(username=data['username'], password=data['password'], gender=data.get('gender'), phone=data.get('phone'), email=data.get('email'), role='user', status=1)
    db.session.add(user); db.session.commit()
    return ok(msg='Registration successful')
