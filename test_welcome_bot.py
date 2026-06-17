import asyncio
import os

from dotenv import load_dotenv
from telegram import Bot

load_dotenv()


async def test():
    bot = Bot(token=os.getenv("TELEGRAM_BOT_TOKEN"))

    me = await bot.get_me()
    print(f"✅ Bot: @{me.username}")

    await bot.send_message(
        chat_id=os.getenv("TELEGRAM_ADMIN_CHAT_ID"),
        text="✅ Welcome Bot is LIVE!\nAll systems ready! 🚀\nSATTEST.UZ",
    )
    print("✅ Admin notified!")


asyncio.run(test())
