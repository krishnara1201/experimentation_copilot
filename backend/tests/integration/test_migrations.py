import os
from pathlib import Path

from alembic import command
from alembic.config import Config


def test_migrations_upgrade_head_on_fresh_database(tmp_path):
    db_path = tmp_path / "migration_smoke.db"
    db_url = f"sqlite+aiosqlite:///{db_path}"

    backend_dir = Path(__file__).resolve().parents[2]
    alembic_ini = backend_dir / "alembic.ini"

    old_database_url = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = db_url

    config = Config(str(alembic_ini))
    config.set_main_option("script_location", str(backend_dir / "migrations"))
    config.set_main_option("sqlalchemy.url", db_url)

    try:
        command.upgrade(config, "head")
    finally:
        if old_database_url is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = old_database_url
