from controller.page_controller import page_bp
from controller.auth import auth_bp
from controller.data_controller import bp as data_bp

def register_blueprints(app):
    app.register_blueprint(page_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(data_bp)
