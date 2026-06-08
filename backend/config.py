import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your_jwt_secret")
# Development
SQLALCHEMY_DATABASE_URI = "sqlite:///app.db"

# Production (add to env vars)
SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///app.db")

# Server config
DEBUG = True
PORT = 5000