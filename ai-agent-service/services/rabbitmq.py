import json
import aio_pika
from config import settings

class RabbitMQPublisher:
    def __init__(self):
        self.connection = None
        self.channel = None

    async def connect(self):
        try:
            self.connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
            self.channel = await self.connection.channel()
            await self.channel.declare_queue("quiz_attempts_queue", durable=True)
            await self.channel.declare_queue("analytics_events_queue", durable=True)
            print("[RabbitMQ] Connected and queues declared successfully")
        except Exception as e:
            print(f"[RabbitMQ] Warning: Could not connect to RabbitMQ: {e}")
            self.connection = None

    async def publish(self, queue_name: str, payload: dict):
        if not self.channel:
            print(f"[RabbitMQ] Channel not ready. Skipping message publish to {queue_name}")
            return
        try:
            message_body = json.dumps(payload).encode("utf-8")
            await self.channel.default_exchange.publish(
                aio_pika.Message(body=message_body, delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
                routing_key=queue_name,
            )
            print(f"[RabbitMQ] Published message to {queue_name}")
        except Exception as e:
            print(f"[RabbitMQ] Publish error to {queue_name}: {e}")

rabbitmq_publisher = RabbitMQPublisher()
