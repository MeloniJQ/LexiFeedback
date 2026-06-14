from flask import Blueprint, request, jsonify
from models import db, User
from utils.jwt_handler import create_token, token_required

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/signup", methods=["POST"])
def signup():
    try:
        data = request.json
        email = data.get("email")
        password = data.get("password")
        full_name = data.get("fullName")
        age = data.get("age")
        education = data.get("education")
        
        # Validate required fields
        if not email or not password or not full_name:
            return jsonify({"error": "Missing required fields"}), 400
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({"error": "User already exists"}), 409
        
        # Create new user
        user = User(
            email=email,
            full_name=full_name,
            age=int(age) if age else None,
            education=education
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        # Generate token
        token = create_token(user)
        
        return jsonify({
            "token": token,
            "user": user.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.json
        email = data.get("email")
        password = data.get("password")
        
        # Validate required fields
        if not email or not password:
            return jsonify({"error": "Missing email or password"}), 400
        
        # Find user
        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({"error": "Invalid credentials"}), 401
        
        # Generate token
        token = create_token(user)
        
        return jsonify({
            "token": token,
            "user": user.to_dict()
        }), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route("/me", methods=["GET"])
@token_required
def get_current_user(payload):
    try:
        user = User.query.get(payload["user_id"])
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify(user.to_dict()), 200
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500