# Auth Testing Playbook — NADIBOX

## MongoDB verification
```
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
```
Verify:
- Admin bcrypt hash starts with `$2b$`
- Unique index on users.username
- Index on login_attempts.identifier
- TTL on password_reset_tokens.expires_at (if used)

## API Testing
```
API_URL="https://audio-ui-splash.preview.emergentagent.com"

# Admin login
curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Expected: JSON with access_token, user {role: "admin"}

# Admin-only: list users
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl -s "$API_URL/api/admin/users" -H "Authorization: Bearer $TOKEN"

# Admin-only: create user
curl -s -X POST "$API_URL/api/admin/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"username":"john","password":"pass123","days":30,"xtream_mode":"shared"}'

# Admin-only: update settings (whatsapp + shared xtream)
curl -s -X PUT "$API_URL/api/admin/settings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"whatsapp_number":"+1234567890","shared_xtream_server":"http://iptv.example.com","shared_xtream_username":"u","shared_xtream_password":"p"}'

# User login + subscription status
curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"pass123"}'

# Expected: user {role:"user", expiry_at, days_remaining, xtream_*}
```
