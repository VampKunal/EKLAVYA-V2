import asyncio
import json
import aio_pika
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

async def process_quiz_attempt(message: aio_pika.IncomingMessage, db):
    async with message.process():
        try:
            payload = json.loads(message.body.decode())
            print(f"[Worker] Processing quiz attempt for user: {payload.get('userId')}")
            
            # Write attempt to MongoDB
            attempts_col = db["quizattempts"]
            await attempts_col.insert_one(payload)
            
            # Update user progress
            user_id = payload.get("userId")
            course_id = payload.get("courseId")
            score = payload.get("score", 0)
            topic = payload.get("topic")
            
            if user_id and course_id:
                progress_col = db["userprogresses"]
                prog = await progress_col.find_one({"userId": user_id, "courseId": course_id})
                
                if not prog:
                    new_prog = {
                        "userId": user_id,
                        "courseId": course_id,
                        "topicsMastered": [topic] if score >= 80 and topic else [],
                        "weakTopics": [{"topic": topic, "accuracy": score, "recommendedAction": f"Score: {score}%. Practice weak areas."}] if score < 75 and topic else [],
                        "accuracy": score,
                        "streakDays": 1,
                        "lastActivity": payload.get("createdAt")
                    }
                    await progress_col.insert_one(new_prog)
                else:
                    new_acc = round((prog.get("accuracy", 0) + score) / 2)
                    update_fields = {"accuracy": new_acc}
                    
                    if score >= 80 and topic and topic not in prog.get("topicsMastered", []):
                        update_fields["$addToSet"] = {"topicsMastered": topic}
                        
                    await progress_col.update_one({"_id": prog["_id"]}, {"$set": update_fields})
                    
            print(f"[Worker] Quiz attempt successfully saved for user: {payload.get('userId')}")
        except Exception as e:
            print(f"[Worker] Error processing quiz attempt: {e}")

async def process_study_session(message: aio_pika.IncomingMessage, db):
    async with message.process():
        try:
            payload = json.loads(message.body.decode())
            thread_id = payload.get("threadId") or payload.get("session_id")
            print(f"[Worker] Processing study session state persistence for threadId: {thread_id}")

            if thread_id:
                sessions_col = db["studysessions"]
                # Upsert session checkpoint state into MongoDB
                await sessions_col.update_one(
                    {"threadId": thread_id},
                    {"$set": payload},
                    upsert=True
                )
                print(f"[Worker] Study session checkpoint successfully saved to MongoDB for thread: {thread_id}")
        except Exception as e:
            print(f"[Worker] Error processing study session checkpoint: {e}")

async def start_worker():
    print("[Worker] Connecting to MongoDB and RabbitMQ...")
    mongo_client = AsyncIOMotorClient(settings.MONGODB_URI)
    try:
        db = mongo_client.get_default_database()
    except Exception:
        db = mongo_client.get_database("eklavya")
    
    connection = None
    for attempt in range(10):
        try:
            connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
            break
        except Exception as e:
            print(f"[Worker] Waiting for RabbitMQ connection (attempt {attempt+1}/10)... Error: {e}")
            await asyncio.sleep(3)

    if not connection:
        raise ConnectionError("[Worker] Failed to connect to RabbitMQ after 10 attempts.")

    channel = await connection.channel()
    
    quiz_queue = await channel.declare_queue("quiz_attempts_queue", durable=True)
    session_queue = await channel.declare_queue("study_sessions_queue", durable=True)
    
    print("[Worker] Ingestion worker is ready. Listening for RabbitMQ messages...")
    await quiz_queue.consume(lambda msg: process_quiz_attempt(msg, db))
    await session_queue.consume(lambda msg: process_study_session(msg, db))
    
    try:
        await asyncio.Future()
    finally:
        await connection.close()

if __name__ == "__main__":
    asyncio.run(start_worker())
