"""
Production Multi-State Seed Script for Community Help Hub.
Populates realistic community data across major Indian states & localities:
Gujarat, Karnataka, Maharashtra, Delhi NCR, Telangana, Goa, Tamil Nadu, West Bengal.
"""
import json
from datetime import datetime, timedelta
from app.database import engine, init_db
from app.models import (
    User, Locality, Post, PostType, Priority, PostStatus, Role,
    VerificationStatus, Rating,
)
from app.auth import hash_password
from sqlmodel import Session, select

init_db()

PASSWORD = "pass1234"

DUMMY_USERS = [
    {
        "name": "Priya Shah", "email": "priya@example.com", "locality": "Gota, Ahmedabad",
        "role": Role.admin, "verified": True, "credits": 135, "rating_avg": 4.95, "rating_count": 14,
        "phone": "+91 98250 12345", "visible": True
    },
    {
        "name": "Arjun Nair", "email": "arjun@example.com", "locality": "Indiranagar, Bengaluru",
        "role": Role.user, "verified": True, "credits": 115, "rating_avg": 4.90, "rating_count": 11,
        "phone": "+91 98450 67890", "visible": True
    },
    {
        "name": "Vikram Malhotra", "email": "vikram@example.com", "locality": "Bandra West, Mumbai",
        "role": Role.user, "verified": True, "credits": 85, "rating_avg": 4.88, "rating_count": 9,
        "phone": "+91 98200 45678", "visible": True
    },
    {
        "name": "Dr. Amit Kulkarni", "email": "amit@example.com", "locality": "Kothrud, Pune",
        "role": Role.user, "verified": True, "credits": 75, "rating_avg": 5.0, "rating_count": 8,
        "phone": "+91 98900 23456", "visible": True
    },
    {
        "name": "Sneha Reddy", "email": "sneha@example.com", "locality": "Hitec City, Hyderabad",
        "role": Role.user, "verified": True, "credits": 60, "rating_avg": 4.85, "rating_count": 7,
        "phone": "+91 98660 34567", "visible": True
    },
    {
        "name": "Kavitha Raman", "email": "kavitha@example.com", "locality": "Adyar, Chennai",
        "role": Role.user, "verified": True, "credits": 55, "rating_avg": 4.92, "rating_count": 6,
        "phone": "+91 98400 56789", "visible": True
    },
    {
        "name": "Ananya Sen", "email": "ananya@example.com", "locality": "Salt Lake, Kolkata",
        "role": Role.user, "verified": True, "credits": 45, "rating_avg": 4.80, "rating_count": 5,
        "phone": "+91 98300 78901", "visible": True
    },
    {
        "name": "Maria Fernandes", "email": "maria@example.com", "locality": "Panaji, Goa",
        "role": Role.user, "verified": True, "credits": 35, "rating_avg": 4.85, "rating_count": 4,
        "phone": "+91 98220 89012", "visible": True
    },
    {
        "name": "Karan Sharma", "email": "karan@example.com", "locality": "Hauz Khas, New Delhi",
        "role": Role.user, "verified": True, "credits": 30, "rating_avg": 4.70, "rating_count": 3,
        "phone": "+91 98110 90123", "visible": False
    },
    {
        "name": "Rahul Mehta", "email": "rahul@example.com", "locality": "Satellite, Ahmedabad",
        "role": Role.user, "verified": True, "credits": 25, "rating_avg": 4.80, "rating_count": 2,
        "phone": "+91 98790 12345", "visible": False
    },
    {
        "name": "Shivam Parmar", "email": "shivam@example.com", "locality": "Bodakdev, Ahmedabad",
        "role": Role.super_admin, "verified": True, "credits": 250, "rating_avg": 5.0, "rating_count": 20,
        "phone": "+91 99999 88888", "visible": True
    },
]

DUMMY_POSTS = [
    {
        "owner_email": "priya@example.com",
        "locality": "Gota, Ahmedabad",
        "type": PostType.need_help,
        "category": "Help Requests",
        "title": "Urgent: Leaking main water shutoff valve in kitchen",
        "description": "Water is actively dripping from the kitchen sink joint and the shutoff valve is jammed. Need anyone with basic plumbing pipe wrench tools nearby.",
        "priority": Priority.high,
        "status": PostStatus.open,
        "days_ago": 1,
    },
    {
        "owner_email": "arjun@example.com",
        "locality": "Indiranagar, Bengaluru",
        "type": PostType.need_help,
        "category": "Help Requests",
        "title": "Need foldable wheelchair for elderly parent for 5 days",
        "description": "My mother is visiting post knee therapy and needs a lightweight foldable wheelchair to move around the society. Will return in spotless condition.",
        "priority": Priority.high,
        "status": PostStatus.open,
        "days_ago": 2,
    },
    {
        "owner_email": "karan@example.com",
        "locality": "Hauz Khas, New Delhi",
        "type": PostType.need_help,
        "category": "Help Requests",
        "title": "Car battery jumpstart needed near Hauz Khas Metro Gate 2",
        "description": "Headlights were left on and battery drained out. If any neighbor has jumper cables and is parked nearby, your 5 minutes would be a huge lifesaver!",
        "priority": Priority.high,
        "status": PostStatus.open,
        "days_ago": 0,
    },
    {
        "owner_email": "ananya@example.com",
        "locality": "Salt Lake, Kolkata",
        "type": PostType.offer_help,
        "category": "Skill Offers",
        "title": "Free weekend college mathematics and calculus mentoring",
        "description": "Former college teaching assistant offering free Saturday tutoring sessions for calculus, linear algebra, and discrete math. In-person or Google Meet.",
        "priority": Priority.medium,
        "status": PostStatus.open,
        "days_ago": 3,
    },
    {
        "owner_email": "sneha@example.com",
        "locality": "Hitec City, Hyderabad",
        "type": PostType.offer_service,
        "category": "Skill Offers",
        "title": "Python, React & Web Development guidance for beginners",
        "description": "Senior software engineer happy to help college students with resume reviews, GitHub projects, and debugging tricky code assignments.",
        "priority": Priority.low,
        "status": PostStatus.open,
        "days_ago": 4,
    },
    {
        "owner_email": "amit@example.com",
        "locality": "Kothrud, Pune",
        "type": PostType.offer_service,
        "category": "Skill Offers",
        "title": "Weekend acoustic guitar & music basics for absolute beginners",
        "description": "Offering free 1-hour sessions on Sunday mornings covering chords, fingerpicking, and simple songs. Bring your guitar and enthusiasm!",
        "priority": Priority.low,
        "status": PostStatus.open,
        "days_ago": 2,
    },
    {
        "owner_email": "vikram@example.com",
        "locality": "Bandra West, Mumbai",
        "type": PostType.need_help,
        "category": "Donations & Giveaways",
        "title": "Fresh surplus catered food (35 lunch boxes) from event",
        "description": "Pure vegetarian lunch boxes packed hygienically 1 hour ago from our society function. Ready for pickup for shelter workers or anyone in need.",
        "priority": Priority.high,
        "status": PostStatus.open,
        "days_ago": 0,
    },
    {
        "owner_email": "arjun@example.com",
        "locality": "Indiranagar, Bengaluru",
        "type": PostType.offer_help,
        "category": "Donations & Giveaways",
        "title": "Giving away solid wooden study table & ergonomic chair",
        "description": "Moving to a furnished home and giving away my sturdy study desk and adjustable office chair for free to any student who can arrange pickup.",
        "priority": Priority.medium,
        "status": PostStatus.open,
        "days_ago": 5,
    },
    {
        "owner_email": "kavitha@example.com",
        "locality": "Adyar, Chennai",
        "type": PostType.offer_help,
        "category": "Donations & Giveaways",
        "title": "Free UPSC & Civil Services exam preparation books (2024)",
        "description": "Complete set of NCERTs, Laxmikanth Polity, and Ramesh Singh Economics in great condition available for any aspiring civil servant.",
        "priority": Priority.medium,
        "status": PostStatus.open,
        "days_ago": 6,
    },
    {
        "owner_email": "rahul@example.com",
        "locality": "Satellite, Ahmedabad",
        "type": PostType.need_help,
        "category": "Community Alerts",
        "title": "Scheduled power maintenance notice for Sector 4 residents",
        "description": "Torrent Power scheduled maintenance from 9:00 AM to 1:00 PM this Thursday. Please plan elevator and backup inverter usage accordingly.",
        "priority": Priority.medium,
        "status": PostStatus.open,
        "days_ago": 1,
    },
    {
        "owner_email": "maria@example.com",
        "locality": "Panaji, Goa",
        "type": PostType.need_help,
        "category": "Community Alerts",
        "title": "Lost Golden Retriever near Miramar Beach park (red collar)",
        "description": "Our 2-year old friendly Golden Retriever slipped out near Miramar park. Answers to the name 'Leo', wearing a red reflective collar. Please call if spotted.",
        "priority": Priority.high,
        "status": PostStatus.open,
        "days_ago": 0,
    },
    {
        "owner_email": "amit@example.com",
        "locality": "Kothrud, Pune",
        "type": PostType.need_help,
        "category": "Community Alerts",
        "title": "Water supply pipeline repair on DP Road tomorrow morning",
        "description": "PMC municipal corporation announced municipal pipeline repairs tomorrow between 7:00 AM and 2:00 PM. Low pressure expected in Kothrud blocks A and B.",
        "priority": Priority.medium,
        "status": PostStatus.open,
        "days_ago": 2,
    },
]

DUMMY_REVIEWS = [
    {
        "rater_email": "rahul@example.com",
        "rated_email": "priya@example.com",
        "stars": 5,
        "tags": ["Fast Response", "Knowledgeable", "Kind Neighbor"],
        "comment": "Priya responded in 15 minutes when our kitchen line burst. Helped turn off the valve and connected us with an honest plumber. Lifesaver!",
    },
    {
        "rater_email": "ananya@example.com",
        "rated_email": "priya@example.com",
        "stars": 5,
        "tags": ["Punctual", "Trusted Helper"],
        "comment": "Super trustworthy and welcoming neighborhood leader. Always looks out for everyone in the society.",
    },
    {
        "rater_email": "sneha@example.com",
        "rated_email": "arjun@example.com",
        "stars": 5,
        "tags": ["Great Mentor", "Patient", "Super Helpful"],
        "comment": "Arjun helped my younger brother debug his college engineering capstone project. Patient, articulate, and truly generous with his time.",
    },
    {
        "rater_email": "kavitha@example.com",
        "rated_email": "vikram@example.com",
        "stars": 5,
        "tags": ["Generous", "Polite", "Community Champion"],
        "comment": "The surplus food boxes were arranged so respectfully. Distributed everything to the night shelter workers. Thank you Vikram!",
    },
    {
        "rater_email": "maria@example.com",
        "rated_email": "amit@example.com",
        "stars": 5,
        "tags": ["Knowledgeable", "Friendly"],
        "comment": "Dr. Amit explained the first-aid steps calmly over the phone until the paramedics arrived. Deeply grateful for neighbors like him.",
    },
]

with Session(engine) as session:
    # 1. Create or fetch localities & users
    email_to_user = {}
    for u in DUMMY_USERS:
        existing = session.exec(select(User).where(User.email == u["email"])).first()
        loc = session.exec(select(Locality).where(Locality.name == u["locality"])).first()
        if not loc:
            loc = Locality(name=u["locality"])
            session.add(loc)
            session.commit()
            session.refresh(loc)

        if existing:
            # Update credentials & reputation to match rich seed
            existing.locality_id = loc.id
            existing.role = u["role"]
            existing.rating_avg = u["rating_avg"]
            existing.rating_count = u["rating_count"]
            existing.credits = u["credits"]
            existing.contact_phone = u.get("phone")
            existing.contact_visible = u.get("visible", False)
            existing.verification_status = (
                VerificationStatus.verified if u["verified"] else VerificationStatus.unverified
            )
            session.add(existing)
            email_to_user[u["email"]] = existing
        else:
            user = User(
                name=u["name"],
                email=u["email"],
                hashed_password=hash_password(PASSWORD),
                locality_id=loc.id,
                role=u["role"],
                rating_avg=u["rating_avg"],
                rating_count=u["rating_count"],
                credits=u["credits"],
                contact_phone=u.get("phone"),
                contact_visible=u.get("visible", False),
                verification_status=(
                    VerificationStatus.verified if u["verified"] else VerificationStatus.unverified
                ),
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            email_to_user[u["email"]] = user
        print(f"User ready: {u['name']} ({u['locality']})")

    session.commit()

    # 2. Seed multi-state posts
    post_objects = []
    for p in DUMMY_POSTS:
        owner = email_to_user[p["owner_email"]]
        loc = session.exec(select(Locality).where(Locality.name == p["locality"])).first()
        exists = session.exec(select(Post).where(Post.title == p["title"])).first()
        if exists:
            post_objects.append(exists)
            continue
        post = Post(
            owner_id=owner.id,
            locality_id=loc.id,
            type=p["type"],
            title=p["title"],
            description=p["description"],
            priority=p["priority"],
            status=p["status"],
            category=p["category"],
            created_at=datetime.utcnow() - timedelta(days=p["days_ago"]),
        )
        session.add(post)
        post_objects.append(post)
        print(f"Created post: {post.title} in {p['locality']}")

    session.commit()

    # 3. Seed reviews & ratings
    first_post = post_objects[0] if post_objects else None
    if first_post:
        for rev in DUMMY_REVIEWS:
            rater = email_to_user.get(rev["rater_email"])
            rated = email_to_user.get(rev["rated_email"])
            if rater and rated:
                exists = session.exec(
                    select(Rating).where(
                        Rating.rater_id == rater.id,
                        Rating.rated_user_id == rated.id,
                    )
                ).first()
                if not exists:
                    rating = Rating(
                        post_id=first_post.id,
                        rater_id=rater.id,
                        rated_user_id=rated.id,
                        stars=rev["stars"],
                        tags=json.dumps(rev["tags"]),
                        comment=rev["comment"],
                        created_at=datetime.utcnow() - timedelta(days=1),
                    )
                    session.add(rating)
                    print(f"Created review from {rater.name} -> {rated.name}")

    session.commit()

print("\n--- Multi-State Seed Complete ---")
print(f"Seeded {len(DUMMY_USERS)} diverse users across 8+ Indian regions.")
print(f"Seeded {len(DUMMY_POSTS)} community posts in all 4 categories.")
print(f"All demo accounts password: {PASSWORD}")
print("Admin: priya@example.com (Community Champion, Verified)")
print("Users in: Ahmedabad, Bengaluru, Mumbai, Pune, Delhi NCR, Hyderabad, Goa, Chennai, Kolkata")
