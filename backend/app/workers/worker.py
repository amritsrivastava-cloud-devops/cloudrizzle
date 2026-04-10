#!/usr/bin/env python3
"""
CloudRizzle Temporal Worker
Run with: python -m app.workers.worker
Or via Docker: docker compose exec backend python -m app.workers.worker
"""
import asyncio
import signal
import sys
import structlog

logger = structlog.get_logger()


async def main():
    """Start the Temporal worker."""
    from app.workers.deploy_workflow import run_worker

    logger.info("Starting CloudRizzle Temporal worker...")

    # Graceful shutdown
    loop = asyncio.get_running_loop()

    def shutdown():
        logger.info("Shutting down worker...")
        for task in asyncio.all_tasks(loop):
            task.cancel()

    loop.add_signal_handler(signal.SIGINT, shutdown)
    loop.add_signal_handler(signal.SIGTERM, shutdown)

    try:
        await run_worker()
    except asyncio.CancelledError:
        logger.info("Worker stopped cleanly")
    except Exception as e:
        logger.error("Worker crashed", error=str(e))
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
