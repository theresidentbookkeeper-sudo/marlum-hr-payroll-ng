# Database migrations

Schema changes go here as numbered SQL files (`0001_name.sql`) so the database
can be rebuilt and handed over. Today the whole app state lives in one JSON row
(`marlum_app_state`, id `main`). Phase 2 moves it into proper tables.
