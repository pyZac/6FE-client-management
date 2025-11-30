const TelegramBot = require('node-telegram-bot-api');
const {
    getUserByUsername,
    getGroupsByPackageAndLanguage,
    linkTelegramId,
    markUserAsRemoved,
    hasUserBeenRemoved,
    getExpiredCustomers,
    isUserInGroup
} = require('./fetch');
require('dotenv').config();

const TOKEN = process.env.BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

// Ensure only one bot instance is running
bot.getMe().then(me => {
    console.log(`🤖 Bot started as: ${me.username}`);
}).catch(err => {
    console.error("❌ Error getting bot info:", err);
});

// Handle /start command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Welcome! Please enter your website username to link your account.");

    bot.once("message", async (response) => {
        const username = response.text.trim();
        console.log(`🔍 User entered username: ${username}`);

        const user = await getUserByUsername(username);
        
        if (!user) {
            bot.sendMessage(chatId, "⚠️ No matching account found. This username is not registered. Please create an account on our website.");
            return;
        }

        console.log(`✅ User found: ${JSON.stringify(user)}`);

        if (user.telegram_id && user.telegram_id !== chatId) {
            bot.sendMessage(chatId, "⚠️ This username is already linked to another Telegram account. Please use the correct account.");
            return;
        }

        const isLinked = await linkTelegramId(username, chatId);
        if (!isLinked) {
            bot.sendMessage(chatId, "❌ Error linking your Telegram account.");
            return;
        }

        bot.sendMessage(chatId, "✅ Your Telegram account has been linked successfully.");

        bot.sendMessage(chatId, "Please choose your language:", {
            reply_markup: {
                keyboard: [["Arabic"], ["English"]],
                one_time_keyboard: true
            }
        });

        bot.once("message", async (languageResponse) => {
            const language = languageResponse.text.trim();
            if (!["Arabic", "English"].includes(language)) {
                bot.sendMessage(chatId, "❌ Invalid choice. Please restart with /start.");
                return;
            }

            console.log(`🌍 User selected language: ${language}`);

            const groups = await getGroupsByPackageAndLanguage(user.paymentPlan, language);
            console.log(`🔍 Groups fetched for ${language}:`, groups);

            if (!groups.length) {
                bot.sendMessage(chatId, `❌ No available groups for ${language}.`);
                return;
            }

            // 🧩 UNBAN STEP BEFORE SENDING LINKS
            for (const group of groups) {
                try {
                    await bot.unbanChatMember(group.id, chatId, { only_if_banned: true });
                    console.log(`✅ Unbanned user ${chatId} from group ${group.name}`);
                } catch (err) {
                    console.error(`⚠️ Failed to unban from ${group.name}:`, err.message);
                }
            }

            const groupButtons = groups.map(group => [{
                text: `Join ${group.name}`,
                url: group.link
            }]);

            bot.sendMessage(chatId, "Click the button to join the groups:", {
                reply_markup: { inline_keyboard: groupButtons }
            });
        });
    });
});

// Function to check for expired subscriptions
let isChecking = false;
const notifiedUsers = new Set();

async function checkExpiredSubscriptions() {
    if (isChecking) {
        console.log("⚠️ checkExpiredSubscriptions() is already running. Skipping duplicate execution.");
        return;
    }

    isChecking = true;
    console.log("🔄 Running checkExpiredSubscriptions()...");

    try {
        const expiredUsers = await getExpiredCustomers();
        console.log(`🔍 Found ${expiredUsers.length} expired users.`);

        for (const user of expiredUsers) {
            console.log(`🔍 Checking expired user: ${user.telegram_id}`);

            if (await hasUserBeenRemoved(user.telegram_id)) {
                console.log(`⚠️ User ${user.telegram_id} has already been removed. Skipping.`);
                continue;
            }

            console.log(`⏳ Waiting 2 minutes before rechecking user: ${user.telegram_id}`);
            await new Promise(resolve => setTimeout(resolve, 120000));

            const arabicGroups = await getGroupsByPackageAndLanguage(user.paymentPlan, "Arabic");
            const englishGroups = await getGroupsByPackageAndLanguage(user.paymentPlan, "English");
            const allGroups = [...arabicGroups, ...englishGroups];

            let removedFromAnyGroup = false;

            for (const group of allGroups) {
                console.log(`Checking if user ${user.telegram_id} is in group ${group.name} (ID: ${group.id})`);
                const isInGroup = await isUserInGroup(bot, group.id, user.telegram_id);
                if (isInGroup) {
                    try {
                        console.log(`🚀 Removing ${user.telegram_id} from ${group.name} (ID: ${group.id})`);
                        await bot.banChatMember(group.id, user.telegram_id);
                        await bot.unbanChatMember(group.id, user.telegram_id);
                        console.log(`✅ Successfully removed ${user.telegram_id} from ${group.name}`);
                        removedFromAnyGroup = true;
                    } catch (err) {
                        console.error(`❌ Failed to remove ${user.telegram_id} from ${group.name}:`, err);
                    }
                } else {
                    console.log(`⚠️ User ${user.telegram_id} is not in ${group.name}, skipping removal.`);
                }
            }

            if (removedFromAnyGroup) {
                await markUserAsRemoved(user.telegram_id);
                console.log(`🛑 Marked ${user.telegram_id} as removed from all groups.`);

                setTimeout(async () => {
                    if (!notifiedUsers.has(user.telegram_id)) {
                        await bot.sendMessage(user.telegram_id, "⏳ Your subscription has expired. Please renew.");
                        console.log(`📢 Expiry message sent to ${user.telegram_id}`);
                        notifiedUsers.add(user.telegram_id);
                    }
                }, 5000);
            }
        }
    } catch (err) {
        console.error("❌ Error fetching expired customers:", err);
    }

    isChecking = false;
    setTimeout(checkExpiredSubscriptions, 300000);
}

// Start checks when bot runs
checkExpiredSubscriptions();

module.exports = { checkExpiredSubscriptions };
