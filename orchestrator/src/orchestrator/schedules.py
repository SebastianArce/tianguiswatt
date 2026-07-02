"""Dagster schedule: ingest all domains and rebuild marts every 15 minutes."""

from dagster import DefaultScheduleStatus, ScheduleDefinition, define_asset_job

pipeline_job = define_asset_job(name="ingest_and_transform", selection="*")

pipeline_schedule = ScheduleDefinition(
    name="every_15_minutes",
    job=pipeline_job,
    cron_schedule="*/15 * * * *",
    # Start running automatically — the web UI is localhost-only in prod, so there's no
    # way to toggle it on there.
    default_status=DefaultScheduleStatus.RUNNING,
)
