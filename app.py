from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from config import Config
from exts import db, migrate
from models import UserInfo
from routes import register_blueprints
from service.utils import hash_password

load_dotenv()


def bootstrap_admin_account():
    if not Config.ADMIN_BOOTSTRAP_ENABLED or not Config.ADMIN_BOOTSTRAP_PASSWORD:
        return
    password = Config.ADMIN_BOOTSTRAP_PASSWORD.strip()
    if not password:
        return

    username = (Config.ADMIN_BOOTSTRAP_USERNAME or 'admin').strip() or 'admin'
    email = (Config.ADMIN_BOOTSTRAP_EMAIL or f'{username}@condensatedb.local').strip() or f'{username}@condensatedb.local'

    if UserInfo.query.filter_by(username=username).first():
        return

    user = UserInfo(
        username=username,
        password=hash_password(password),
        email=email,
        role='admin',
        status=1
    )
    try:
        db.session.add(user)
        db.session.commit()
    except Exception:
        db.session.rollback()


def create_app():
    app = Flask(__name__, template_folder='templates', static_folder='static')
    app.config.from_object(Config)
    CORS(app, resources={r"/api/*": {"origins": Config.CORS_ORIGINS}})
    db.init_app(app)
    migrate.init_app(app, db)
    register_blueprints(app)

    with app.app_context():
        bootstrap_admin_account()

    return app


app = create_app()

if __name__ == '__main__':
    app.run(
        host=Config.SERVER_HOST,
        port=Config.SERVER_PORT,
        debug=Config.DEBUG
    )
