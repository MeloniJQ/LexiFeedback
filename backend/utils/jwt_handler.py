import jwt
import datetime
import os
from functools import wraps
from flask import request, jsonify

def create_token(user):
    """Create JWT token for a user"""
    payload = {
        "user_id": user.id,
        "email": user.email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, os.getenv("JWT_SECRET_KEY", "your_jwt_secret"), algorithm="HS256")

def verify_token(token):
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, os.getenv("JWT_SECRET_KEY", "your_jwt_secret"), algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in headers
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({"error": "Invalid token format"}), 401
        
        if not token:
            return jsonify({"error": "Token is missing"}), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        # Pass payload to the route function
        return f(payload, *args, **kwargs)
    
    return decorated