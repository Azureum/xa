"""Row-Level Security SQL shared by the Alembic migration and the test suite.

This SQL only assumes what a real Supabase Postgres project already provides:
the `auth.users` table and the `auth.uid()` function. It does not create
roles or the `auth` schema itself -- see scripts/bootstrap_local_supabase.sql
for the local-only emulation of those.
"""

HELPER_FUNCTION_SQL = """
CREATE OR REPLACE FUNCTION business_ids_for_current_user()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT business_id FROM business_users WHERE user_id = auth.uid();
$$;
"""

DROP_HELPER_FUNCTION_SQL = "DROP FUNCTION IF EXISTS business_ids_for_current_user();"

# Tables with a direct `business_id` column.
_DIRECT_TABLES = [
    "locations",
    "business_profiles",
    "products",
    "faqs",
    "policies",
    "additional_knowledge_entries",
    "ai_personalities",
    "landing_configs",
    "promotions",
    "assets",
    "conversations",
    "scan_events",
]

# Tables scoped through a parent table's business_id (no direct column).
_INDIRECT_TABLES = {
    "product_photos": ("product_id", "products"),
    "landing_photos": ("landing_config_id", "landing_configs"),
    "promotion_locations": ("promotion_id", "promotions"),
    "promotion_photos": ("promotion_id", "promotions"),
    "messages": ("conversation_id", "conversations"),
}

GRANTED_ROLES = ("authenticated", "service_role")


def _enable_and_force(table: str) -> str:
    return (
        f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;\n"
        f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;\n"
    )


def _grants(table: str) -> str:
    grants = "\n".join(
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO {role};" for role in GRANTED_ROLES
    )
    return grants + "\n"


def _direct_policy(table: str) -> str:
    return (
        f"CREATE POLICY tenant_isolation ON {table}\n"
        f"    USING (business_id IN (SELECT business_ids_for_current_user()))\n"
        f"    WITH CHECK (business_id IN (SELECT business_ids_for_current_user()));\n"
    )


def _indirect_policy(table: str, fk_column: str, parent_table: str) -> str:
    return (
        f"CREATE POLICY tenant_isolation ON {table}\n"
        f"    USING ({fk_column} IN (\n"
        f"        SELECT id FROM {parent_table}\n"
        f"        WHERE business_id IN (SELECT business_ids_for_current_user())\n"
        f"    ))\n"
        f"    WITH CHECK ({fk_column} IN (\n"
        f"        SELECT id FROM {parent_table}\n"
        f"        WHERE business_id IN (SELECT business_ids_for_current_user())\n"
        f"    ));\n"
    )


def build_enable_rls_sql() -> str:
    statements = [HELPER_FUNCTION_SQL]

    # businesses: scoped by its own id, not a business_id column. INSERT is
    # split out unconditionally (WITH CHECK true) because at creation time no
    # business_users row exists yet to satisfy the ownership lookup -- the
    # same chicken-and-egg problem business_users itself has below.
    statements.append(_enable_and_force("businesses"))
    statements.append(_grants("businesses"))
    statements.append(
        "CREATE POLICY select_own_businesses ON businesses\n"
        "    FOR SELECT\n"
        "    USING (id IN (SELECT business_ids_for_current_user()));\n"
    )
    statements.append(
        "CREATE POLICY insert_business ON businesses\n"
        "    FOR INSERT\n"
        "    WITH CHECK (true);\n"
    )
    statements.append(
        "CREATE POLICY update_own_businesses ON businesses\n"
        "    FOR UPDATE\n"
        "    USING (id IN (SELECT business_ids_for_current_user()))\n"
        "    WITH CHECK (id IN (SELECT business_ids_for_current_user()));\n"
    )
    statements.append(
        "CREATE POLICY delete_own_businesses ON businesses\n"
        "    FOR DELETE\n"
        "    USING (id IN (SELECT business_ids_for_current_user()));\n"
    )

    # business_users: self-referential, needs a dedicated insert policy so a
    # brand-new user (zero memberships yet) can create their first row.
    statements.append(_enable_and_force("business_users"))
    statements.append(_grants("business_users"))
    statements.append(
        "CREATE POLICY select_own_memberships ON business_users\n"
        "    FOR SELECT\n"
        "    USING (business_id IN (SELECT business_ids_for_current_user()));\n"
    )
    statements.append(
        "CREATE POLICY insert_own_membership ON business_users\n"
        "    FOR INSERT\n"
        "    WITH CHECK (user_id = auth.uid());\n"
    )

    for table in _DIRECT_TABLES:
        statements.append(_enable_and_force(table))
        statements.append(_grants(table))
        statements.append(_direct_policy(table))

    for table, (fk_column, parent_table) in _INDIRECT_TABLES.items():
        statements.append(_enable_and_force(table))
        statements.append(_grants(table))
        statements.append(_indirect_policy(table, fk_column, parent_table))

    return "\n".join(statements)


def build_disable_rls_sql() -> str:
    all_tables = ["businesses", "business_users", *_DIRECT_TABLES, *_INDIRECT_TABLES.keys()]
    scoped_tables = [t for t in all_tables if t not in ("businesses", "business_users")]
    statements = [f"DROP POLICY IF EXISTS tenant_isolation ON {t};" for t in scoped_tables]
    statements.append("DROP POLICY IF EXISTS select_own_businesses ON businesses;")
    statements.append("DROP POLICY IF EXISTS insert_business ON businesses;")
    statements.append("DROP POLICY IF EXISTS update_own_businesses ON businesses;")
    statements.append("DROP POLICY IF EXISTS delete_own_businesses ON businesses;")
    statements.append("DROP POLICY IF EXISTS select_own_memberships ON business_users;")
    statements.append("DROP POLICY IF EXISTS insert_own_membership ON business_users;")
    statements.extend(f"ALTER TABLE {t} DISABLE ROW LEVEL SECURITY;" for t in all_tables)
    statements.append(DROP_HELPER_FUNCTION_SQL)
    return "\n".join(statements)
