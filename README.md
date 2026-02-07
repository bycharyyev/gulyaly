YOU ARE A SENIOR MARKETPLACE ARCHITECT
with real production experience at Wildberries / Ozon scale.

CONTEXT:
This is a real marketplace with SELLER, ADMIN, USER.
Backend exists but critical logic + UI bugs remain.
You must FIX and COMPLETE the system.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 ABSOLUTE RULES (DO NOT BREAK)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. NO VISUAL BUGS
   - ALL input / textarea / password fields MUST have visible text
   - Text must be readable in light & dark mode
   - NO white text on white background

2. BACKEND IS SOURCE OF TRUTH
   - Seller cannot publish products without admin approval
   - Home page shows ONLY approved products
   - Ownership checks are mandatory

3. NO EMPTY PAGES
   - Seller pages
   - Admin pages
   - Home page

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 UI FIXES (CRITICAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FIX ALL INPUT FIELDS:

- seller login (email, password)
- product create
- product edit
- store create/edit
- admin forms

MANDATORY STYLES:
- input, textarea:
  - text-black (light)
  - text-white (dark)
  - bg-white / bg-neutral-900
  - placeholder-visible
- DO NOT rely on inherited color

VERIFY VISUALLY that text is readable.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 PRODUCT LIFECYCLE (MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHANGE PRODUCT FLOW TO:

1. SELLER creates product
   → status = PENDING_APPROVAL
   → NOT visible on home page
   → NOT purchasable

2. ADMIN reviews product
   → APPROVE → status = ACTIVE
   → REJECT → status = REJECTED (with reason)

3. ONLY ACTIVE products:
   - appear on home page
   - appear in search
   - can be bought

SELLER CANNOT SELF-ACTIVATE PRODUCTS.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 BACKEND FIXES (REQUIRED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ FIX PRODUCT UPDATE ERROR
- Ensure PATCH /api/seller/products/[id]:
  - accepts partial updates
  - validates seller ownership
  - does NOT require fields that frontend doesn’t send
  - returns clear error messages

2️⃣ FIX HOME PAGE
- Home page MUST load products from database
- Query ONLY:
  - status = ACTIVE
  - store not banned
- NO mock data
- NO hardcoded products

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛠️ ADMIN DASHBOARD (MANDATORY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPLEMENT ADMIN PRODUCT MODERATION:

ROUTES:
- /admin/products
- /admin/products/[id]

FEATURES:
- List products with status = PENDING_APPROVAL
- View full product info
- Approve product
- Reject product with reason

API:
- GET  /api/admin/products?status=PENDING_APPROVAL
- PATCH /api/admin/products/[id]/approve
- PATCH /api/admin/products/[id]/reject

SECURITY:
- ADMIN ONLY
- 403 on unauthorized access

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏠 HOME PAGE REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Home page MUST:
- Load products from DB
- Show product cards
- Include:
  - image
  - title
  - price
  - store name

ONLY show ACTIVE products.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 VALIDATION CHECKLIST (MUST PASS ALL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Text visible in ALL inputs  
✅ Seller can create product  
✅ Product goes to PENDING_APPROVAL  
✅ Product NOT visible on home page  
✅ Admin approves product  
✅ Product becomes ACTIVE  
✅ Product appears on home page  
✅ Seller CANNOT bypass moderation  
✅ Product edit works without errors  

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 FINAL OUTPUT REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You MUST confirm:

1. UI text visibility fixed everywhere
2. Product update error resolved
3. Admin product moderation implemented
4. Home page shows DB products
5. Full flow works on localhost:3000

DO NOT STOP UNTIL ALL CHECKS PASS.
THIS IS A REAL MONEY MARKETPLACE.
