import os

import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from .schemas import DBHealthResponse, PostCreate, PostRead, PostUpdate

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL is None:
    raise RuntimeError("DATABASE_URL is not set")

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return "ok"


@app.get("/db-health", response_model=DBHealthResponse)
def db_health():
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            row = cur.fetchone()

    return DBHealthResponse(status="ok", db="ok", result=row[0])


@app.get("/posts", response_model=list[PostRead])
def get_posts():
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    title,
                    content,
                    type,
                    status,
                    priority,
                    due_date,
                    created_at,
                    updated_at
                FROM posts
                ORDER BY id DESC
                """
            )
            posts = cur.fetchall()
    
    return posts


@app.post("/posts", response_model=PostRead, status_code=201)
def create_post(post: PostCreate):
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO posts (
                    title,
                    content,
                    type,
                    status,
                    priority,
                    due_date
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING
                    id,
                    title,
                    content,
                    type,
                    status,
                    priority,
                    due_date,
                    created_at,
                    updated_at
                """,
                (
                    post.title,
                    post.content,
                    post.type,
                    post.status,
                    post.priority,
                    post.due_date,
                ),
            )
            created_post = cur.fetchone()

    return created_post


@app.get("/posts/{post_id}", response_model=PostRead)
def get_post(post_id: int):
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    title,
                    content,
                    type,
                    status,
                    priority,
                    due_date,
                    created_at,
                    updated_at
                FROM posts
                WHERE id = %s
                """,
                (post_id,),
            )
            post = cur.fetchone()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    return post


@app.patch("/posts/{post_id}", response_model=PostRead)
def update_post(post_id: int, post: PostUpdate):
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE posts
                SET
                    title = COALESCE(%s, title),
                    content = COALESCE(%s, content),
                    type = COALESCE(%s, type),
                    status = COALESCE(%s, status),
                    priority = COALESCE(%s, priority),
                    due_date = COALESCE(%s, due_date),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING
                    id,
                    title,
                    content,
                    type,
                    status,
                    priority,
                    due_date,
                    created_at,
                    updated_at
                """,
                (
                    post.title,
                    post.content,
                    post.type,
                    post.status,
                    post.priority,
                    post.due_date,
                    post_id,
                ),
            )
            updated_post = cur.fetchone()

    if updated_post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    return updated_post


@app.delete("/posts/{post_id}", status_code=204)
def delete_post(post_id: int):
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM posts
                WHERE id = %s
                RETURNING id
                """,
                (post_id,),
            )
            deleted_post = cur.fetchone()

    if deleted_post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    return Response(status_code=204)