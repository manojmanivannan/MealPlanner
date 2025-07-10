"""Add recipe check trigger

Revision ID: 806043e02277
Revises: f49b347a5577
Create Date: 2025-07-09 21:40:26.953827

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '806043e02277'
down_revision: Union[str, Sequence[str], None] = 'f49b347a5577'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



# Your raw SQL for the function and trigger
create_function_sql = """
CREATE OR REPLACE FUNCTION check_recipe_ids_exist()
RETURNS trigger AS $$
DECLARE
    rid integer;
BEGIN
    IF NEW.recipe_ids IS NOT NULL THEN
        FOREACH rid IN ARRAY NEW.recipe_ids LOOP
            IF NOT EXISTS (SELECT 1 FROM recipes WHERE id = rid) THEN
                RAISE EXCEPTION 'Recipe id % does not exist', rid;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

create_trigger_sql = """
CREATE CONSTRAINT TRIGGER trg_check_recipe_ids_exist
AFTER INSERT OR UPDATE ON weekly_plan
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_recipe_ids_exist();
"""

drop_trigger_sql = "DROP TRIGGER IF EXISTS trg_check_recipe_ids_exist ON weekly_plan;"
drop_function_sql = "DROP FUNCTION IF EXISTS check_recipe_ids_exist();"


def upgrade() -> None:
    op.execute(create_function_sql)
    op.execute(create_trigger_sql)


def downgrade() -> None:
    op.execute(drop_trigger_sql)
    op.execute(drop_function_sql)