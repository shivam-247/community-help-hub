# Community Help Hub 🏘️

A **human-centered, AI-powered mutual aid platform** that connects neighbors across Indian cities for help requests, donations, skill sharing, and community alerts — with verified identity, spam filtering, and a transparent trust system.

---

## ✨ Key Features

- **Smart Feed** — State & locality cascading dropdowns to filter notices by region
- **Anti-Bogus Filter** — AI validates posts for quality; rejects keyboard mashing, number-only titles, and gibberish
- **Post Types** — Help Requests, Donations & Giveaways, Skill Offers, Community Alerts
- **Verified Identity** — Admin-reviewed credential verification with trust badges
- **Interactive Ratings** — Rate resolved exchanges with stars, tags, and testimonials
- **Avatar System** — 8 distinct colorful SVG avatars with per-user selection
- **Super Admin RBAC** — Full role-based access control (`user`, `admin`, `super_admin`)
- **Admin Command Center** — Verification queue, content moderation, and user role management
- **Real-time Inbox** — Respond to help requests privately
- **ML Auto-categorization** — Posts are auto-tagged by category and spam-scored
- **Zero icon library dependency** — All icons are hand-crafted SVG

---

## 🗂️ Project Structure

```
community-help-hub/
├── backend/               # FastAPI + SQLModel + SQLite
│   ├── app/
│   │   ├── models.py      # SQLModel ORM models + enums
│   │   ├── schemas.py     # Pydantic request/response schemas
│   │   ├── auth.py        # JWT auth + RBAC dependencies
│   │   ├── main.py        # FastAPI app + router registration
│   │   ├── ml.py          # ML engine: spam scoring, categorization
│   │   ├── database.py    # SQLite engine + session factory
│   │   └── routers/
│   │       ├── auth_router.py          # Signup, Login, Avatar, Contact
│   │       ├── posts_router.py         # CRUD, locality filter, image upload
│   │       ├── users_router.py         # Public profile + reviews
│   │       ├── admin_router.py         # Admin stats, moderation, RBAC
│   │       ├── verification_router.py  # Identity verification queue
│   │       ├── ratings_router.py       # Post ratings + testimonials
│   │       ├── inbox_router.py         # Private messages
│   │       └── reports_router.py       # Content reporting
│   ├── seed.py            # Multi-state demo data seeder
│   └── requirements.txt   # Python dependencies
│
└── frontend/              # Next.js 14 App Router + Tailwind CSS
    ├── app/
    │   ├── page.js               # Feed with cascading location filters
    │   ├── create-post/page.js   # Create notice with anti-bogus validation
    │   ├── post/[id]/page.js     # Post detail with interactive ratings
    │   ├── profile/[id]/page.js  # Public user profile + testimonials
    │   ├── settings/page.js      # Avatar picker + contact + verification
    │   ├── admin/page.js         # Super Admin command center
    │   ├── inbox/page.js         # Private messaging inbox
    │   └── about/page.js         # About us + mission
    ├── components/
    │   ├── Nav.js          # Sticky navbar with profile popover
    │   ├── PostCard.js     # Feed post card with avatar + badges
    │   ├── Avatars.js      # 8 SVG avatar presets
    │   ├── Icons.js        # Zero-dep custom SVG icon library
    │   └── Skeleton.js     # Loading skeleton components
    └── lib/
        ├── api.js           # Fetch wrapper with auth headers
        ├── auth-context.js  # React auth context + JWT management
        └── locations.js     # Indian states + localities catalog
```

---

## 🚀 Running Locally

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
# Configure JWT_SECRET_KEY in your shell or hosting environment first.
# Demo seeding is optional and disabled by default; see SECURITY.md.
uvicorn app.main:app --reload --port 8000
```
API runs at: `http://localhost:8000`  
Swagger docs: `http://localhost:8000/docs`

### Frontend
```bash
cd frontend
npm install
npm run build    # Production (fast — sub-100ms per page)
npm start
```
App runs at: `http://localhost:3000`

---

## Security and account setup

Read [SECURITY.md](SECURITY.md) before deploying. Configure backend `JWT_SECRET_KEY` and
`MFA_ENCRYPTION_KEY`, frontend `API_BASE_URL` and `APP_ORIGIN`, and HTTPS hosting.
Browser authentication uses an HttpOnly session cookie through the Next.js server.
Production no longer seeds accounts or accepts the old demo password.

Bootstrap an administrator locally against the intended database:
```bash
cd backend
python manage_user.py your-email@example.com --role super_admin
```
The CLI prompts for a strong password without logging it. Enable authenticator MFA in Settings.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | FastAPI + SQLModel |
| Database | SQLite (file-based, zero-config) |
| Auth | JWT (PyJWT), HttpOnly browser sessions, optional TOTP MFA |
| ML Engine | scikit-learn / custom heuristics |
| Frontend | Next.js 16 (App Router) |
| Styling | Lumen React 4, Tailwind CSS, light/dark semantic themes |
| Icons | Lumen Lucide icons and existing avatar illustrations |
| Image Upload | FastAPI static files |

---

## 📍 Covered Regions

Posts can be created and filtered across: **Gujarat, Maharashtra, Karnataka, Delhi NCR, Telangana, Goa, Tamil Nadu, West Bengal, Rajasthan, Kerala** — with 50+ specific localities.

---

Built with ❤️ for Indian neighborhoods by Shivam Parmar

