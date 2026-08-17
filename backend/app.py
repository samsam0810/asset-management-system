from flask import Flask, jsonify, request, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps



app = Flask(__name__)




app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"


# Demo 用途使用固定字串；正式 production 環境不應將 SECRET_KEY 直接硬編碼在 source code。
app.config["SECRET_KEY"] = "demo-secret-key"




db = SQLAlchemy(app)




# status 只允許以下三種值
VALID_STATUSES = ["使用中", "閒置", "維修中"]




class Asset(db.Model):



    id = db.Column(
        db.Integer,
        primary_key=True
    )



    name = db.Column(
        db.String(100),
        nullable=False
    )



    status = db.Column(
        db.String(50),
        nullable=False
    )




class User(db.Model):



    id = db.Column(
        db.Integer,
        primary_key=True
    )



    username = db.Column(
        db.String(80),
        unique=True,
        nullable=False
    )



    password_hash = db.Column(
        db.String(200),
        nullable=False
    )




with app.app_context():
    db.create_all()



    # 查詢 Demo User 是否已經存在，避免重複建立
    admin_user = User.query.filter_by(username="admin").first()



    if admin_user is None:
        # 不存在才建立，password 只存 hash，不存明文
        admin_user = User(
            username="admin",
            password_hash=generate_password_hash("admin123")
        )



        db.session.add(admin_user)



        db.session.commit()

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):

        # 只檢查 Session 是否存在 user_id，不查詢 Database
        if session.get("user_id") is None:
            return jsonify({
                "message": "Login required"
            }), 401

        return f(*args, **kwargs)

    return wrapper


@app.route("/api/login", methods=["POST"])
def login():


    # silent=True：Request Body 不是合法 JSON 或不存在時回傳 None，不會直接拋出例外
    data = request.get_json(silent=True)


    # Request Body 不存在或為空
    if not data:
        return jsonify({
            "message": "Request body is required"
        }), 400


    # username 必須存在
    if "username" not in data:
        return jsonify({
            "message": "username is required"
        }), 400


    # password 必須存在
    if "password" not in data:
        return jsonify({
            "message": "password is required"
        }), 400


    username = data["username"]
    password = data["password"]


    # 使用 username 查詢 User
    user = User.query.filter_by(username=username).first()


    # User 不存在，或密碼不正確，統一回傳相同訊息，避免洩漏帳號是否存在
    if user is None or not check_password_hash(user.password_hash, password):
        return jsonify({
            "message": "Invalid username or password"
        }), 401


    # 驗證通過，將 user_id 寫入 Session
    session["user_id"] = user.id


    return jsonify({
        "message": "Login successful",
        "user": {
            "id": user.id,
            "username": user.username
        }
    })


@app.route("/api/logout", methods=["POST"])
def logout():

    # logout 是冪等操作，不需要檢查是否已登入，直接清除 Session
    session.clear()

    return jsonify({
        "message": "Logout successful"
    })


@app.route("/api/auth/me")
def get_current_user():

    user_id = session.get("user_id")

    # Session 中沒有 user_id，代表未登入
    if user_id is None:
        return jsonify({
            "message": "Login required"
        }), 401

    user = db.session.get(User, user_id)

    # Session 中有 user_id，但對應的 User 已經不存在，視為 Session 失效
    if user is None:
        session.clear()

        return jsonify({
            "message": "Login required"
        }), 401

    return jsonify({
        "user": {
            "id": user.id,
            "username": user.username
        }
    })

@app.route("/api/assets")
@login_required
def get_assets():





    # 讀取 Query Parameter，若不存在則為 None
    search = request.args.get("search")
    status = request.args.get("status")





    query = Asset.query





    # search 存在且去除空白後不為空字串時，才加入篩選條件
    if search and search.strip():
        query = query.filter(Asset.name.ilike(f"%{search.strip()}%"))





    # status 存在且不為空字串時，才加入篩選條件
    if status and status.strip():
        query = query.filter(Asset.status == status.strip())





    assets = query.all()





    return jsonify([
        {
            "id": asset.id,
            "name": asset.name,
            "status": asset.status
        }
        for asset in assets
    ])




@app.route("/api/assets", methods=["POST"])
@login_required
def create_asset():



    data = request.json



    # Request Body 不存在或為空
    if not data:
        return jsonify({
            "message": "Request body is required"
        }), 400



    # name 必須存在
    if "name" not in data:
        return jsonify({
            "message": "name is required"
        }), 400



    # status 必須存在
    if "status" not in data:
        return jsonify({
            "message": "status is required"
        }), 400



    name = data["name"]
    status = data["status"]



    # name 不能是空值或空字串
    if not name:
        return jsonify({
            "message": "name cannot be empty"
        }), 400



    # status 不能是空值或空字串
    if not status:
        return jsonify({
            "message": "status cannot be empty"
        }), 400



    # status 只允許固定的三種值
    if status not in VALID_STATUSES:
        return jsonify({
            "message": "Invalid status"
        }), 400



    # 驗證全部通過後才建立 Asset
    asset = Asset(
        name=name,
        status=status
    )



    # try：嘗試執行 Database 操作
    try:
        db.session.add(asset)



        db.session.commit()



    # except：捕捉 Database 操作發生的 Exception
    except Exception as e:
        # rollback：發生錯誤時取消這次的 Transaction，避免資料庫留下不完整的變更
        db.session.rollback()



        return jsonify({
            "message": "Database error"
        }), 500



    return jsonify({
        "message": "Asset created",
        "id": asset.id
    })




@app.route("/api/assets/<int:asset_id>", methods=["PUT"])
@login_required
def update_asset(asset_id):
    """Update an existing asset's name and/or status (partial update)."""



    # 使用新版 SQLAlchemy 寫法查詢單筆資料
    asset = db.session.get(Asset, asset_id)



    # 查無資料時回傳 404
    if asset is None:
        return jsonify({
            "message": "Asset not found"
        }), 404



    data = request.json



    # Request Body 不存在或為空
    if not data:
        return jsonify({
            "message": "Request body is required"
        }), 400



    # name 為選填欄位，若有提供才驗證
    if "name" in data:
        name = data["name"]



        # name 不能是空值或空字串
        if not name:
            return jsonify({
                "message": "name cannot be empty"
            }), 400



    # status 為選填欄位，若有提供才驗證
    if "status" in data:
        status = data["status"]



        # status 不能是空值或空字串
        if not status:
            return jsonify({
                "message": "status cannot be empty"
            }), 400



        # status 只允許固定的三種值
        if status not in VALID_STATUSES:
            return jsonify({
                "message": "Invalid status"
            }), 400



    # 驗證全部通過後才進行更新（維持 Partial Update 行為）
    if "name" in data:
        asset.name = data["name"]



    if "status" in data:
        asset.status = data["status"]



    # try：欄位修改完成後，嘗試提交到資料庫
    try:
        db.session.commit()



    # except：捕捉 Database commit 發生的 Exception
    except Exception as e:
        # rollback：發生錯誤時取消這次的 Transaction，避免資料庫留下不完整的變更
        db.session.rollback()



        return jsonify({
            "message": "Database error"
        }), 500



    return jsonify({
        "message": "Asset updated"
    })




@app.route("/api/assets/<int:asset_id>", methods=["DELETE"])
@login_required
def delete_asset(asset_id):
    """Delete an existing asset by id."""



    # 使用新版 SQLAlchemy 寫法查詢單筆資料
    asset = db.session.get(Asset, asset_id)



    # 查無資料時回傳 404
    if asset is None:
        return jsonify({
            "message": "Asset not found"
        }), 404



    # try：Asset 存在後，嘗試執行刪除並提交
    try:
        db.session.delete(asset)



        db.session.commit()



    # except：捕捉 Database 操作發生的 Exception
    except Exception as e:
        # rollback：發生錯誤時取消這次的 Transaction，避免資料庫留下不完整的變更
        db.session.rollback()



        return jsonify({
            "message": "Database error"
        }), 500



    return jsonify({
        "message": "Asset deleted"
    }), 200




if __name__ == "__main__":
    app.run(debug=True)