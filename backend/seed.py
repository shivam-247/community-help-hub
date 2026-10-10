"""Create labelled sample notices only; never fabricate reviews or credentials."""
import os
from app.database import engine, init_db
from app import models, product_models
from app.demo import seed_demo

def run_seed():
    if os.getenv("DEMO_SEED_ENABLED") != "true":
        raise RuntimeError("Demo seeding is disabled. Set DEMO_SEED_ENABLED=true for labelled samples only.")
    init_db()
    seed_demo(engine)

if __name__ == "__main__":
    run_seed()
