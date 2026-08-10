from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy


app = Flask(__name__)


app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"


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


with app.app_context():
    db.create_all()


@app.route("/api/assets")
def get_assets():

    assets = Asset.query.all()

    return jsonify([
        {
            "id": asset.id,
            "name": asset.name,
            "status": asset.status
        }
        for asset in assets
    ])


@app.route("/api/assets", methods=["POST"])
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