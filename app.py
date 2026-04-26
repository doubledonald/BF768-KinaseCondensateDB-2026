from flask import Flask
from config import Config
from exts import db, migrate
from routes import register_blueprints


def create_app():
    app = Flask(__name__, template_folder='templates', static_folder='static')
    app.config.from_object(Config)
    db.init_app(app)
    migrate.init_app(app, db)
    register_blueprints(app)
    return app


app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
