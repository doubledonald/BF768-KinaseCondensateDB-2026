import os

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'condensatedb-secret-key-change-me')
    JWT_SECRET = os.getenv('JWT_SECRET', 'condensatedb-jwt-secret-change-me')
    JWT_EXPIRE_HOURS = int(os.getenv('JWT_EXPIRE_HOURS', '8'))

    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'mysql+pymysql://donald6:donald6@bioed-new.bu.edu:4253/Team3?charset=utf8mb4'
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_AS_ASCII = False