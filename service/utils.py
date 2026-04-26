import csv, io, jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app, Response
from openpyxl import Workbook
from exts import db


def ok(data=None, msg='success'):
    return jsonify({'code': 200, 'msg': msg, 'data': data})

def fail(msg='error', code=400):
    return jsonify({'code': code, 'msg': msg, 'data': None}), code


def model_to_dict(obj, exclude=None):
    exclude = set(exclude or [])
    data = {}
    for col in obj.__table__.columns:
        if col.name in exclude:
            continue
        val = getattr(obj, col.name)
        if isinstance(val, datetime): val = val.strftime('%Y-%m-%d %H:%M:%S')
        elif hasattr(val, 'quantize'): val = float(val)
        data[col.name] = val
    return data


def make_token(user):
    payload = {
        'user_id': user.user_id,
        'username': user.username,
        'role': user.role,
        'exp': datetime.utcnow() + timedelta(hours=current_app.config['JWT_EXPIRE_HOURS'])
    }
    return jwt.encode(payload, current_app.config['JWT_SECRET'], algorithm='HS256')


def current_user_payload():
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    try:
        return jwt.decode(auth[7:], current_app.config['JWT_SECRET'], algorithms=['HS256'])
    except Exception:
        return None


def jwt_required(role=None):
    def deco(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            payload = current_user_payload()
            if not payload:
                return fail('Login required or token expired', 401)
            if role and payload.get('role') != role:
                return fail('Permission denied', 403)
            request.jwt_user = payload
            return fn(*args, **kwargs)
        return wrapper
    return deco


def paginate_query(query, serializer=model_to_dict):
    page = max(int(request.args.get('page', 1)), 1)
    size = min(max(int(request.args.get('size', 10)), 1), 100)
    pagination = query.paginate(page=page, per_page=size, error_out=False)
    return {'items': [serializer(x) for x in pagination.items], 'total': pagination.total, 'page': page, 'size': size}


def export_rows(rows, columns, filename='export', filetype='csv'):
    if filetype == 'excel':
        wb = Workbook(); ws = wb.active; ws.title = 'data'; ws.append([c[1] for c in columns])
        for r in rows: ws.append([r.get(c[0], '') for c in columns])
        bio = io.BytesIO(); wb.save(bio); bio.seek(0)
        return Response(bio.read(), mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', headers={'Content-Disposition': f'attachment; filename={filename}.xlsx'})
    sio = io.StringIO(); writer = csv.writer(sio); writer.writerow([c[1] for c in columns])
    for r in rows: writer.writerow([r.get(c[0], '') for c in columns])
    data = '\ufeff' + sio.getvalue()
    return Response(data, mimetype='text/csv; charset=utf-8', headers={'Content-Disposition': f'attachment; filename={filename}.csv'})


def apply_like(query, model, fields):
    kw = request.args.get('keyword', '').strip()
    if kw:
        from sqlalchemy import or_
        query = query.filter(or_(*[getattr(model, f).like(f'%{kw}%') for f in fields]))
    for f in fields:
        v = request.args.get(f, '').strip()
        if v: query = query.filter(getattr(model, f).like(f'%{v}%'))
    return query
