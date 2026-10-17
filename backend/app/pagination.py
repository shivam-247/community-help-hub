"""Bounded list queries; metadata is also available to the same-origin proxy."""
from fastapi import Query

class PageParams:
    def __init__(self, page: int = Query(1, ge=1, le=100000),
                 page_size: int = Query(20, ge=1, le=50)):
        self.page = page
        self.page_size = page_size


def paginate(session, statement, paging, response):
    rows = session.exec(statement.offset((paging.page - 1) * paging.page_size).limit(paging.page_size + 1)).all()
    response.headers['X-Page'] = str(paging.page)
    response.headers['X-Page-Size'] = str(paging.page_size)
    response.headers['X-Has-More'] = str(len(rows) > paging.page_size).lower()
    return rows[:paging.page_size]
