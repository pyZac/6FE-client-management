require('dotenv').config();
const mysql = require('mysql2');

// ✅ Log environment variables for debugging
console.log(`🛠️ DB_HOST: ${process.env.DB_HOST}`);
console.log(`🛠️ DB_USERNAME: ${process.env.DB_USERNAME}`);
console.log(`🛠️ DB_DATABASE: ${process.env.DB_DATABASE}`);

// ✅ Use a connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ✅ Ensure database connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Database connection failed:", err.message);
        return;
    }
    console.log(`✅ Connected to database on host: ${process.env.DB_HOST}`);
    connection.release();
});

// ✅ Get user details by username
async function getUserByUsername(username) {
    try {
        const [results] = await pool.promise().query(
            "SELECT username, telegram_id, paymentPlan, ExpDate, removed_from_groups FROM payments WHERE username = ?",
            [username]
        );

        if (results.length) {
            console.log(`✅ User found: ${JSON.stringify(results[0])}`);
            return results[0];
        } else {
            console.log(`⚠️ No user found for username: ${username}`);
            return null;
        }
    } catch (error) {
        console.error("❌ Error fetching user:", error);
        return null;
    }
}

// ✅ Store telegram_id for a user and reset `removed_from_groups` **only if renewed**
async function linkTelegramId(username, telegramId) {
    try {
        // ✅ Check if the user's subscription is still active
        const [user] = await pool.promise().query(
            "SELECT ExpDate, removed_from_groups FROM payments WHERE username = ?",
            [username]
        );

        if (user.length === 0) {
            console.log(`⚠️ No user found for username: ${username}`);
            return false;
        }

        const expirationDate = new Date(user[0].ExpDate);
        const today = new Date();

        if (expirationDate >= today && user[0].removed_from_groups === 1) {
            console.log(`🔄 User ${username} has renewed! Resetting removed_from_groups.`);
            await pool.promise().query(
                "UPDATE payments SET telegram_id = ?, removed_from_groups = 0 WHERE username = ?",
                [telegramId, username]
            );
        } else {
            console.log(`✅ User ${username} linked, but no renewal detected.`);
            await pool.promise().query(
                "UPDATE payments SET telegram_id = ? WHERE username = ?",
                [telegramId, username]
            );
        }

        console.log(`✅ Telegram ID updated for user: ${username} (ID: ${telegramId})`);
        return true;
    } catch (error) {
        console.error("❌ Error updating telegram_id:", error);
        return false;
    }
}

// ✅ Get group details based on package and language
async function getGroupsByPackageAndLanguage(paymentPlan, language) {
    try {
        console.log(`📌 Fetching groups for Plan: ${paymentPlan}, Language: ${language}`);

        const [results] = await pool.promise().query(
            "SELECT group_id, group_name, invite_link FROM telegram_groups WHERE package = ? AND language = ?",
            [paymentPlan, language]
        );

        if (results.length === 0) {
            console.log(`⚠️ No groups found for Plan: ${paymentPlan}, Language: ${language}`);
            return [];
        }

        console.log(`✅ Retrieved ${results.length} groups for Plan: ${paymentPlan}, Language: ${language}`);
        return results.map(row => ({
            id: row.group_id,
            name: row.group_name,
            link: row.invite_link
        }));
    } catch (error) {
        console.error("❌ Error fetching groups:", error);
        return [];
    }
}

// ✅ Get expired users (who haven't been removed yet)
async function getExpiredCustomers() {
    try {
        console.log("📌 Fetching expired users...");

        const [results] = await pool.promise().query(
            "SELECT telegram_id, paymentPlan FROM payments WHERE ExpDate < CURDATE() AND telegram_id IS NOT NULL AND removed_from_groups = 0"
        );

        if (results.length === 0) {
            console.log("⚠️ No expired users found.");
        } else {
            console.log(`✅ Found ${results.length} expired users.`);
        }

        return results;
    } catch (error) {
        console.error("❌ Error fetching expired customers:", error);
        return [];
    }
}

// ✅ Get users with only 5 days left in their subscription
async function getUsersExpiringSoon() {
    try {
        const [results] = await pool.promise().query(
            "SELECT telegram_id, ExpDate, paymentPlan FROM payments WHERE ExpDate = DATE_ADD(CURDATE(), INTERVAL 5 DAY) AND telegram_id IS NOT NULL AND removed_from_groups = 0"
        );

        if (results.length === 0) {
            console.log("⚠️ No users found with 5 days left.");
        } else {
            console.log(`✅ Found ${results.length} users with 5 days left.`);
        }

        return results;
    } catch (error) {
        console.error("❌ Error fetching users expiring soon:", error);
        return [];
    }
}

// ✅ Check if user has already been removed from groups
async function hasUserBeenRemoved(telegramId) {
    try {
        const [results] = await pool.promise().query(
            "SELECT removed_from_groups FROM payments WHERE telegram_id = ?",
            [telegramId]
        );

        if (results.length > 0 && results[0].removed_from_groups === 1) {
            console.log(`⚠️ User ${telegramId} is already removed.`);
            return true;
        }
        return false;
    } catch (error) {
        console.error("❌ Error checking user removal status:", error);
        return false;
    }
}

// ✅ Check if user is still in a group before attempting to remove them
async function isUserInGroup(bot, groupId, telegramId) {
    try {
        const member = await bot.getChatMember(groupId, telegramId);
        if (member.status === "member" || member.status === "administrator") {
            console.log(`✅ User ${telegramId} is in group ${groupId}`);
            return true;
        } else {
            console.log(`⚠️ User ${telegramId} is NOT in group ${groupId}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error checking if user ${telegramId} is in group ${groupId}:`, error);
        return false; // Assume user is not in group if error occurs
    }
}

// ✅ Mark user as removed from all groups
async function markUserAsRemoved(telegramId) {
    try {
        const [result] = await pool.promise().query(
            "UPDATE payments SET removed_from_groups = 1 WHERE telegram_id = ?",
            [telegramId]
        );

        if (result.affectedRows > 0) {
            console.log(`🛑 User ${telegramId} marked as removed from groups.`);
        } else {
            console.log(`⚠️ User ${telegramId} was not updated. Already marked?`);
        }
    } catch (error) {
        console.error("❌ Error marking user as removed:", error);
    }
}

// ✅ Export functions
module.exports = {
    getUserByUsername,
    getGroupsByPackageAndLanguage,
    getExpiredCustomers,
    getUsersExpiringSoon,
    linkTelegramId,
    markUserAsRemoved,
    hasUserBeenRemoved, // ✅ Ensure it's included
    isUserInGroup
};
