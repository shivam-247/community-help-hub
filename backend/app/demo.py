"""Opt-in, clearly labelled sample posts; no demo login credentials exist."""
import os
import secrets
from datetime import datetime, timedelta, timezone
from sqlmodel import Session, select
from .models import User, Locality, Post, PostType, Priority, VerificationStatus
from .product_models import DemoPost
from .auth import hash_password

SAMPLES = [
    ("Nisha Shah", "Gota, Ahmedabad · 382481", "Maths books for Class 8 and 9", "Giving away two sets of Gujarati medium maths books. Collect from the society gate on Saturday morning.", "Donations & Giveaways", PostType.offer_help),
    ("Rahul Patel", "Satellite, Ahmedabad · 380015", "Can someone lend a folding ladder?", "Need a ladder for an hour to fix a curtain rod. I can collect it from your society and return it the same evening.", "Help Requests", PostType.need_help),
    ("Meera Desai", "Gota, Ahmedabad · 382481", "Free help with online school forms", "Happy to help parents fill school admission forms on Sunday. Bring the documents you need; no fees and no sharing passwords.", "Skill Offers", PostType.offer_service),
    ("Farhan Shaikh", "Bopal, Ahmedabad · 380058", "Two plant pots looking for a home", "Two terracotta pots are spare after repotting. Please collect from our reception this weekend. Both are clean and ready to use.", "Donations & Giveaways", PostType.offer_help),
    ("Kavita Joshi", "Satellite, Ahmedabad · 380015", "Society library sorting this Sunday", "Neighbours are meeting near the clubhouse at ten to sort donated books. Join for an hour if you can; children are welcome with a parent.", "Community Alerts", PostType.offer_help),
    ("Dev Shah", "Gota, Ahmedabad · 382481", "ગુજરાતી વાંચવામાં મદદ કરી શકું", "શનિવારે સાંજે બાળકોને ગુજરાતી વાંચવામાં મદદ કરી શકું છું. સોસાયટીના કોમન રૂમમાં મળીએ. કોઈ ફી નથી.", "Skill Offers", PostType.offer_service),
]

def seed_demo(engine):
    if os.getenv("DEMO_SEED_ENABLED") != "true":
        return
    with Session(engine) as session:
        if session.exec(select(DemoPost)).first():
            return
        for i, (name, area, title, description, category, kind) in enumerate(SAMPLES):
            email = f"sample-{i}@example.invalid"
            user = session.exec(select(User).where(User.email == email)).first()
            loc = session.exec(select(Locality).where(Locality.name == area)).first()
            if not loc:
                loc = Locality(name=area); session.add(loc); session.flush()
            if not user:
                user = User(name=name, email=email, hashed_password=hash_password(secrets.token_urlsafe(48)), locality_id=loc.id, credits=[10,55,100,0,20,10][i], avatar="initials")
                session.add(user); session.flush()
            post = Post(owner_id=user.id, locality_id=loc.id, type=kind, title=title, description=description, category=category, priority=Priority.medium, created_at=datetime.now(timezone.utc)-timedelta(hours=i*3+1))
            session.add(post); session.flush(); session.add(DemoPost(post_id=post.id))
        session.commit()
