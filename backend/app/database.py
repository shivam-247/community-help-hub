import os
from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./community_help_hub.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False, "timeout": 30} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)


def init_db():
    SQLModel.metadata.create_all(engine)
    from sqlalchemy import Index, text
    from .models import Post, Message, ResponseRequest
    from .product_models import Notification
    if engine.dialect.name == 'sqlite':
        with engine.connect() as connection:
            connection.execute(text('PRAGMA journal_mode=WAL'))
            connection.execute(text('PRAGMA busy_timeout=30000'))
    for name, columns in [
        ('ix_post_owner_created', [Post.owner_id, Post.created_at, Post.id]),
        ('ix_message_request_id', [Message.response_request_id, Message.id]),
        ('ix_request_requester_created', [ResponseRequest.requester_id, ResponseRequest.created_at]),
        ('ix_notification_user_read', [Notification.user_id, Notification.read, Notification.id]),
    ]:
        index = next((item for item in columns[0].class_.__table__.indexes if item.name == name), None)
        if index is None:
            index = Index(name, *columns)
        index.create(engine, checkfirst=True)
    from .safety import purge_completed_chats
    purge_completed_chats(engine)


def get_session():
    with Session(engine) as session:
        try:
            yield session
        except Exception:
            session.rollback()
            raise

