#!/usr/bin/env python3
# ════════════════════════════════════════════════════════════
# NJADDER PRO v12.0 — Pyrogram Engine Service
# ════════════════════════════════════════════════════════════
# يستقبل طلبات HTTP من Next.js وينفذها بـ Pyrogram
# Port: 5000 (localhost only)
# ════════════════════════════════════════════════════════════

import asyncio
import json
import os
import sys
import random
import string
import time
import traceback
from datetime import datetime

# Fix asyncio for Pyrogram
try:
    asyncio.get_event_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())

from flask import Flask, request, jsonify
from flask_cors import CORS
from pyrogram import Client, enums, types as pyro_types
from pyrogram.enums import UserStatus
from pyrogram.raw import functions, types
from pyrogram.types import InputPhoneContact
from pyrogram.errors import (
    FloodWait, InviteRequestSent, PeerFlood, PeerIdInvalid,
    UsernameInvalid, UsernameOccupied, UserNotParticipant, UserNotMutualContact,
    UserPrivacyRestricted, UserAlreadyParticipant, UserChannelsTooMuch, UserIdInvalid,
    UserKicked, ChatAdminRequired, UserBannedInChannel, RPCError,
    PhoneNumberUnoccupied, PhoneNumberInvalid, PhoneNumberOccupied,
    PhoneNumberBanned, PhoneNumberFlood, ApiIdInvalid,
    UserDeactivated, AuthKeyUnregistered, SessionExpired,
    UserDeactivatedBan, SessionRevoked
)

app = Flask(__name__)
CORS(app)

API_ID = int(os.environ.get("TELEGRAM_API_ID", "35923747"))
API_HASH = os.environ.get("TELEGRAM_API_HASH", "6de1cf34ed1e68d94615ba7b45391dde")

# ════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════

def smart_delay(base=2):
    time.sleep(random.uniform(base * 0.5, base * 1.8))

async def smart_delay_async(base=2):
    await asyncio.sleep(random.uniform(base * 0.5, base * 1.8))

def get_client(session_string, api_id=None, api_hash=None):
    """إنشاء عميل Pyrogram من StringSession"""
    return Client(
        "njadder_bot",
        api_id=api_id or API_ID,
        api_hash=api_hash or API_HASH,
        session_string=session_string,
        in_memory=True,
        no_updates=True,
    )

async def resolve_peer_safe(app, user_id):
    """حلّ peer بأمان — يعادل _resolve_peer_safe في nn.py"""
    try:
        peer = await app.resolve_peer(int(user_id))
        if peer is not None:
            return peer
    except Exception:
        pass
    try:
        user = await app.get_users(int(user_id))
        if user is not None:
            try:
                return await app.resolve_peer(int(user_id))
            except Exception:
                return None
    except Exception:
        pass
    return None

async def add_member_safe(app, target_chat_id, user_id, member_info=None):
    """إضافة عضو بأمان — يعادل _add_member_safe في nn.py"""
    peer = await resolve_peer_safe(app, user_id)
    if peer is None:
        name = member_info.get('first_name', '') if member_info else ''
        return (False, f'PEER_ID_INVALID — cannot meet user {user_id} ({name})')

    try:
        await app.add_chat_members(target_chat_id, int(user_id))
        return (True, 'OK — added')
    except UserKicked:
        try:
            await app.unban_chat_member(target_chat_id, int(user_id))
            await asyncio.sleep(1)
            await app.add_chat_members(target_chat_id, int(user_id))
            return (True, 'OK — added (after unban)')
        except Exception as e2:
            return (False, f'USER_KICKED — unban failed: {e2.__class__.__name__}')
    except UserAlreadyParticipant:
        return (True, 'already a participant')
    except UserChannelsTooMuch:
        return (False, 'USER_CHANNELS_TOO_MUCH')
    except UserPrivacyRestricted:
        return (False, 'UserPrivacyRestricted')
    except PeerFlood:
        return (False, 'PeerFlood')
    except FloodWait as e:
        return (False, f'FloodWait {e.value}s')
    except ChatAdminRequired:
        return (False, 'ChatAdminRequired')
    except Exception as e:
        return (False, f'{e.__class__.__name__}: {e}')

async def smart_contact_recycle(app, target_chat_id, member, delay=0):
    """دورة جهة اتصال — يعادل _smart_contact_recycle في nn.py"""
    uid = member['user_id']
    fname = member.get('first_name') or ''

    # 1. resolve peer
    try:
        await app.resolve_peer(int(uid))
    except Exception:
        try:
            await app.get_users(int(uid))
        except Exception:
            return ('failed', 'PEER_ID_INVALID')

    # 2. add as contact
    try:
        await app.add_contact(uid, fname)
        if delay:
            await asyncio.sleep(delay)
    except UserPrivacyRestricted:
        return ('privacy', 'privacy')
    except FloodWait as e:
        return ('flood', f'FloodWait {e.value}s')
    except PeerFlood:
        return ('peerflood', 'PeerFlood')
    except Exception as e:
        return ('failed', f'{e.__class__.__name__}')

    # 3. resolve again
    try:
        await app.resolve_peer(int(uid))
    except Exception:
        pass

    # 4. add to group
    try:
        await app.add_chat_members(target_chat_id, uid)
    except UserAlreadyParticipant:
        try:
            await app.delete_contacts([uid])
        except Exception:
            pass
        return ('exists', 'recycled')
    except UserPrivacyRestricted:
        try:
            await app.delete_contacts([uid])
        except Exception:
            pass
        return ('privacy', 'privacy')
    except PeerFlood:
        return ('peerflood', 'PeerFlood')
    except FloodWait as e:
        return ('flood', f'FloodWait {e.value}s')
    except UserChannelsTooMuch:
        return ('failed', 'UserChannelsTooMuch')
    except Exception as e:
        try:
            await app.delete_contacts([uid])
        except Exception:
            pass
        return ('failed', f'{e.__class__.__name__}')

    # 5. delete contact (cleanup)
    try:
        await app.delete_contacts([uid])
    except Exception:
        pass
    return ('added', 'OK')

# ════════════════════════════════════════════════════════════
# API ROUTES
# ════════════════════════════════════════════════════════════

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "service": "pyrogram", "version": "12.0"})

@app.route("/scrape", methods=["POST"])
def scrape():
    """سحب أعضاء من مجموعة"""
    data = request.json
    session_string = data.get("session_string", "")
    group_link = data.get("group_link", "")
    limit = int(data.get("limit", 100))
    use_messages = data.get("use_messages", False)

    if not session_string or not group_link:
        return jsonify({"ok": False, "error": "session_string and group_link required"}), 400

    async def run():
        log = []
        app = get_client(session_string, data.get("api_id"), data.get("api_hash"))
        try:
            await app.start()
            log.append(f"📥 السحب من: {group_link}")

            # join group
            try:
                await app.join_chat(group_link)
            except UserAlreadyParticipant:
                pass
            except Exception as e:
                log.append(f"⚠️ join: {e}")

            chat = await app.get_chat(group_link)
            members = []

            if use_messages:
                # سحب عبر الرسائل (للمجموعات المخفية)
                log.append("👻 استراتيجية: messages")
                seen = set()
                async for msg in app.get_chat_history(chat.id, limit=limit * 3):
                    if not msg.from_user or msg.from_user.is_bot:
                        continue
                    uid = msg.from_user.id
                    if uid in seen:
                        continue
                    seen.add(uid)
                    members.append({
                        "user_id": uid,
                        "first_name": msg.from_user.first_name or "",
                        "last_name": msg.from_user.last_name or "",
                        "username": msg.from_user.username or "",
                    })
                    if len(members) >= limit:
                        break
            else:
                # سحب عادي
                log.append("👥 استراتيجية: members")
                async for m in app.get_chat_members(chat.id):
                    if len(members) >= limit:
                        break
                    u = m.user
                    members.append({
                        "user_id": u.id,
                        "first_name": u.first_name or "",
                        "last_name": u.last_name or "",
                        "username": u.username or "",
                    })

            log.append(f"✓ سُحب {len(members)} عضو")
            csv = "\n".join([
                f"{m['user_id']}|{m.get('first_name','')}|{m.get('last_name','')}|{m.get('username','')}"
                for m in members
            ])
            return {"ok": True, "output": "\n".join(log) + "\n\n--- النتائج ---\n" + csv, "count": len(members)}
        except Exception as e:
            return {"ok": False, "error": str(e)[:200], "output": "\n".join(log) + f"\n❌ {e}"}
        finally:
            try:
                await app.stop()
            except:
                pass

    result = asyncio.run(run())
    return jsonify(result)

@app.route("/add", methods=["POST"])
def add_members():
    """إضافة أعضاء لمجموعة — يستخدم Contact Recycle لأعلى نسبة نجاح"""
    data = request.json
    session_string = data.get("session_string", "")
    target_group = data.get("target_group", "")
    source_group = data.get("source_group", "")
    user_list_csv = data.get("user_list", "")
    count = int(data.get("count", 50))
    delay = int(data.get("delay", 3))
    use_contact_recycle = data.get("contact_recycle", True)

    if not session_string or not target_group:
        return jsonify({"ok": False, "error": "session_string and target_group required"}), 400

    if not source_group and not user_list_csv:
        return jsonify({"ok": False, "error": "source_group or user_list required"}), 400

    async def run():
        log = []
        app = get_client(session_string, data.get("api_id"), data.get("api_hash"))
        try:
            await app.start()
            log.append(f"🔗 الاتصال...")

            # join target
            try:
                await app.join_chat(target_group)
            except UserAlreadyParticipant:
                pass
            except Exception as e:
                return {"ok": False, "error": f"تعذّر الانضمام للهدف: {e}", "output": "\n".join(log)}

            target_chat = await app.get_chat(target_group)
            target_id = target_chat.id
            log.append(f"✓ الهدف: {target_chat.title or target_id}")

            # get existing members
            existing = set()
            try:
                async for m in app.get_chat_members(target_id):
                    existing.add(m.user.id)
            except Exception:
                pass
            log.append(f"📋 موجودين بالفعل: {len(existing)}")

            # get users
            users = []
            if source_group:
                # scrape from source
                log.append(f"📥 السحب من: {source_group}")
                try:
                    await app.join_chat(source_group)
                except UserAlreadyParticipant:
                    pass
                except Exception:
                    pass
                src_chat = await app.get_chat(source_group)
                async for m in app.get_chat_members(src_chat.id):
                    if len(users) >= count:
                        break
                    u = m.user
                    if u.id in existing:
                        continue
                    if u.is_bot or u.is_deleted:
                        continue
                    users.append({
                        "user_id": u.id,
                        "first_name": u.first_name or "",
                        "last_name": u.last_name or "",
                        "username": u.username or "",
                    })
                log.append(f"✓ سُحب {len(users)} عضو (بعد إزالة الموجودين)")
            elif user_list_csv:
                for line in user_list_csv.strip().split("\n"):
                    parts = line.split("|")
                    if len(parts) >= 1 and parts[0].strip().isdigit():
                        uid = int(parts[0].strip())
                        if uid not in existing:
                            users.append({
                                "user_id": uid,
                                "first_name": parts[1].strip() if len(parts) > 1 else "",
                                "last_name": parts[2].strip() if len(parts) > 2 else "",
                                "username": parts[3].strip() if len(parts) > 3 else "",
                            })
                log.append(f"📋 تحميل {len(users)} عضو من القائمة")

            if not users:
                return {"ok": True, "output": "\n".join(log) + "\n\n❌ لا يوجد أعضاء جدد للإضافة", "added": 0, "skipped": 0, "already": len(existing)}

            # ADD
            log.append(f"\n➕ إضافة {len(users)} عضو...")
            added = 0
            skipped = 0
            already = 0
            errors = 0
            error_reasons = {}

            for i, u in enumerate(users):
                uid = u["user_id"]
                fname = u.get("first_name") or str(uid)

                if use_contact_recycle:
                    status, reason = await smart_contact_recycle(app, target_id, u, delay)
                else:
                    ok, reason = await add_member_safe(app, target_id, uid, u)
                    if ok:
                        status = "added" if "already" not in reason else "exists"
                    else:
                        status = "failed"
                        reason = reason

                if status == "added":
                    added += 1
                    log.append(f"✓ {fname}")
                elif status == "exists":
                    already += 1
                elif status == "flood":
                    log.append(f"⛔ Flood — توقف: {reason}")
                    break
                elif status == "peerflood":
                    log.append(f"⛔ PeerFlood — توقف")
                    break
                else:
                    errors += 1
                    short_reason = reason[:50] if reason else "unknown"
                    error_reasons[short_reason] = error_reasons.get(short_reason, 0) + 1

                if delay:
                    await smart_delay_async(delay)

            log.append(f"\n📊 ✓ {added} أُضيف | ⊘ {skipped} تخطّي | ⚠️ {already} موجود | ❌ {errors} خطأ")
            if error_reasons:
                log.append("\n--- أسباب التخطّي ---")
                for reason, c in sorted(error_reasons.items(), key=lambda x: -x[1]):
                    log.append(f"  • {reason}: {c}")

            return {"ok": True, "output": "\n".join(log), "added": added, "skipped": skipped, "already": already, "errors": errors}
        except Exception as e:
            traceback.print_exc()
            return {"ok": False, "error": str(e)[:200], "output": "\n".join(log) + f"\n❌ {e}"}
        finally:
            try:
                await app.stop()
            except:
                pass

    result = asyncio.run(run())
    return jsonify(result)

@app.route("/send_code", methods=["POST"])
def send_code():
    """إرسال كود تيليجرام لتسجيل دخول جديد"""
    data = request.json
    phone = data.get("phone", "")
    if not phone:
        return jsonify({"ok": False, "error": "phone required"}), 400

    async def run():
        app = Client(
            "njadder_login",
            api_id=data.get("api_id", API_ID),
            api_hash=data.get("api_hash", API_HASH),
            in_memory=True,
            no_updates=True,
        )
        try:
            await app.start()
            sent = await app.send_code(phone)
            session_string = await app.export_session_string()
            await app.stop()
            return {
                "ok": True,
                "session_string": session_string,
                "phone_code_hash": sent.phone_code_hash,
            }
        except Exception as e:
            try:
                await app.stop()
            except:
                pass
            return {"ok": False, "error": str(e)[:200]}

    return jsonify(asyncio.run(run()))

@app.route("/verify_code", methods=["POST"])
def verify_code():
    """التحقق من كود تيليجرام"""
    data = request.json
    phone = data.get("phone", "")
    code = data.get("code", "")
    session_string = data.get("session_string", "")
    phone_code_hash = data.get("phone_code_hash", "")
    password = data.get("password", "")

    if not phone or not code or not session_string:
        return jsonify({"ok": False, "error": "phone, code, session_string required"}), 400

    async def run():
        app = Client(
            "njadder_login",
            api_id=data.get("api_id", API_ID),
            api_hash=data.get("api_hash", API_HASH),
            session_string=session_string,
            in_memory=True,
            no_updates=True,
        )
        try:
            await app.start()
            try:
                await app.sign_in(phone, code, phone_code_hash=phone_code_hash)
            except Exception as e:
                if "SESSION_PASSWORD_NEEDED" in str(e).upper() or password:
                    if password:
                        await app.check_password(password)
                    else:
                        return {"ok": False, "error": "2FA required", "need2FA": True}
                else:
                    raise e

            me = await app.get_me()
            new_session = await app.export_session_string()
            await app.stop()
            return {
                "ok": True,
                "session_string": new_session,
                "user": {
                    "id": me.id,
                    "first_name": me.first_name or "",
                    "last_name": me.last_name or "",
                    "username": me.username or "",
                    "phone": me.phone or "",
                }
            }
        except Exception as e:
            try:
                await app.stop()
            except:
                pass
            return {"ok": False, "error": str(e)[:200]}

    return jsonify(asyncio.run(run()))

@app.route("/account_info", methods=["POST"])
def account_info():
    """معلومات الحساب الكاملة"""
    data = request.json
    session_string = data.get("session_string", "")
    if not session_string:
        return jsonify({"ok": False, "error": "session_string required"}), 400

    async def run():
        app = get_client(session_string, data.get("api_id"), data.get("api_hash"))
        try:
            await app.start()
            me = await app.get_me()
            result = {
                "ok": True,
                "info": {
                    "id": me.id,
                    "first_name": me.first_name or "",
                    "last_name": me.last_name or "",
                    "username": me.username or "",
                    "phone": me.phone or "",
                    "is_premium": me.is_premium,
                    "is_verified": me.is_verified,
                    "is_scam": me.is_scam,
                    "is_fake": me.is_fake,
                    "is_bot": me.is_bot,
                    "is_deleted": me.is_deleted,
                    "status": str(me.status) if me.status else "unknown",
                }
            }
            await app.stop()
            return result
        except Exception as e:
            try:
                await app.stop()
            except:
                pass
            return {"ok": False, "error": str(e)[:200]}

    return jsonify(asyncio.run(run()))

@app.route("/send_message", methods=["POST"])
def send_message():
    """إرسال رسالة لمجموعة أو مستخدم"""
    data = request.json
    session_string = data.get("session_string", "")
    target = data.get("target", "")
    message = data.get("message", "")
    count = int(data.get("count", 1))
    delay = int(data.get("delay", 3))

    if not session_string or not target or not message:
        return jsonify({"ok": False, "error": "session_string, target, message required"}), 400

    async def run():
        log = []
        app = get_client(session_string, data.get("api_id"), data.get("api_hash"))
        try:
            await app.start()
            log.append(f"📨 إرسال {count} رسالة إلى: {target}")
            sent = 0
            for i in range(count):
                try:
                    await app.send_message(target, message)
                    sent += 1
                    log.append(f"✓ {i+1}/{count}")
                    if delay:
                        await smart_delay_async(delay)
                except FloodWait as e:
                    log.append(f"⏰ FloodWait {e.value}s")
                    break
                except Exception as e:
                    log.append(f"✗ {e}")
                    break
            log.append(f"\n📊 ✓ {sent}/{count} مُرسلة")
            await app.stop()
            return {"ok": True, "output": "\n".join(log), "sent": sent}
        except Exception as e:
            try:
                await app.stop()
            except:
                pass
            return {"ok": False, "error": str(e)[:200], "output": "\n".join(log)}

    return jsonify(asyncio.run(run()))

# ════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🐍 NJADDER Pyrogram Service v12.0")
    print(f"📡 API ID: {API_ID}")
    print(f"🚀 Starting on port 5000...")
    app.run(host="127.0.0.1", port=5000, debug=False, threaded=True)
