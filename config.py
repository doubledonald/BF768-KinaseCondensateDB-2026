import os

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'condensatedb-secret-key-change-me')
    JWT_SECRET = os.getenv('JWT_SECRET', 'condensatedb-jwt-secret-change-me')
    JWT_EXPIRE_HOURS = int(os.getenv('JWT_EXPIRE_HOURS', '8'))
    SERVER_HOST = os.getenv('SERVER_HOST', '0.0.0.0')
    SERVER_PORT = int(os.getenv('SERVER_PORT', '5000'))
    DEBUG = os.getenv('DEBUG', 'false').lower() in ('1', 'true', 'yes', 'on')
    ALLOW_PUBLIC_REGISTRATION = os.getenv('ALLOW_PUBLIC_REGISTRATION', 'true').lower() in (
        '1', 'true', 'yes', 'on'
    )

    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'mysql+pymysql://USER:PASSWORD@HOST:3306/Team3?charset=utf8mb4'
    )
    CORS_ORIGINS = [x.strip() for x in os.getenv('CORS_ORIGINS', '*').split(',') if x.strip()]
    if not CORS_ORIGINS:
        CORS_ORIGINS = ['*']
    ADMIN_BOOTSTRAP_ENABLED = os.getenv('ADMIN_BOOTSTRAP_ENABLED', 'false').lower() in ('1', 'true', 'yes', 'on')
    ADMIN_BOOTSTRAP_USERNAME = os.getenv('ADMIN_BOOTSTRAP_USERNAME', 'admin')
    ADMIN_BOOTSTRAP_PASSWORD = os.getenv('ADMIN_BOOTSTRAP_PASSWORD', '')
    ADMIN_BOOTSTRAP_EMAIL = os.getenv('ADMIN_BOOTSTRAP_EMAIL', 'admin@condensatedb.com')

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_AS_ASCII = False
