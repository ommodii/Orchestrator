const { Client } = require("pg");
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 9000;
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST || "db",
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
    ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false
});

async function runDiagnostics(client) {
    console.log("🧬 Running diagnostics");
    const result = await client.query("SELECT version(), NOW();");
    if (result.rows.length > 0) {
        console.log("✅ Database connection successful");
    } else {
        console.log("❌ Database connection failed");
    }
}

async function runSentinel() {
    console.log("🚀 Running sentinel");
    try {
        await client.connect();
        console.log("✅ Connected to the database");

        // Initialize logs table
        await client.query(`
            CREATE TABLE IF NOT EXISTS logs (
                id SERIAL PRIMARY KEY,
                content TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log("✅ Logs table initialized");

        await runDiagnostics(client);

    } catch (err) {
        console.error("❌ Failed to connect to the database", err);

        process.exit(1);
    }
}

app.post("/save", async (req, res) => {
    const { type, data } = req.body;

    // Validations
    if (!type || !data) {
        return res.status(400).json({ error: "❌ Missing type or data" });
    }

    try {
        const query = `
            INSERT INTO orchestrator (type, data)
            VALUES ($1, $2)
            RETURNING id, type, created_at
        `

        const values = [type, JSON.stringify(data)]
        const result = await client.query(query, values)

        res.status(201).json({
            message: "✅ Data saved successfully",
            entry: result.rows[0]
        });

    } catch (error) {
        console.error("❌ Failed to save data", error);
        res.status(500).json({ error: "❌ Failed to save data" });
    }
});

app.delete("/orchestrator/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const query = "DELETE FROM orchestrator WHERE id = $1 RETURNING id, type";
        const values = [id];
        const result = await client.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Entry not found" });
        }

        res.json({
            message: "✅ Data deleted successfully",
            entry: result.rows[0]
        });

    } catch (error) {
        console.error("❌ Failed to delete data", error);
        res.status(500).json({ error: "❌ Failed to delete data" });
    }
});

app.get("/orchestrator", async (req, res) => {
    try {
        const result = await client.query("SELECT * FROM orchestrator ORDER BY created_at DESC LIMIT 100");
        res.json({ entries: result.rows });
    } catch (error) {
        console.error("❌ Failed to fetch data", error);
        res.status(500).json({ error: "❌ Failed to fetch data" });
    }
});

app.get("/orchestrator/type/:type", async (req, res) => {
    try {
        const { type } = req.params;
        const result = await client.query(
            "SELECT * FROM orchestrator WHERE type = $1 ORDER BY created_at DESC",
            [type]
        );

        res.json({ entries: result.rows });
    } catch (error) {
        console.error("❌ Failed to fetch data", error);
        res.status(500).json({ error: "❌ Failed to fetch data" });
    }
});

app.get("/orchestrator/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await client.query(
            "SELECT * FROM orchestrator WHERE id = $1", [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Entry not found" });
        }
        res.json({ entry: result.rows[0] });
    } catch (error) {
        console.error("❌ Failed to fetch data", error);
        res.status(500).json({ error: "❌ Failed to fetch data" });
    }
});

app.get("/api/status", async (req, res) => {
    try {
        const result = await client.query("SELECT NOW()");
        res.json({
            status: "online",
            database: "connected",
            latency: "ok",
            serverTime: result.rows[0].now,
            version: "Node 25 / Postgres 18"
        });
    } catch (error) {
        console.error("❌ Database status check failed", error);
        res.status(500).json({
            status: "error",
            message: "Database Unreachable"
        });
    }
});

app.post("/api/command", async (req, res) => {
    const { command } = req.body;

    if (!command || typeof command !== 'string') {
        return res.status(400).json({
            response: "❌ [ERROR]: No command provided"
        });
    }

    const cmd = command.trim().toLowerCase();
    const originalCommand = command.trim();

    try {
        // INSERT command
        if (cmd.startsWith('insert ')) {
            const text = originalCommand.substring(7).trim();
            if (!text) {
                return res.json({
                    response: "❌ [ERROR]: No text provided for insert"
                });
            }
            await client.query("INSERT INTO logs (content) VALUES ($1)", [text]);
            return res.json({
                response: `✅ [SUCCESS]: Data persisted to Mainframe.`
            });
        }

        // VIEW command
        if (cmd === 'view') {
            const result = await client.query(
                "SELECT * FROM logs ORDER BY created_at DESC LIMIT 20"
            );
            if (result.rows.length === 0) {
                return res.json({
                    response: "📭 [INFO]: No records found in logs table."
                });
            }
            const formatted = result.rows.map(row =>
                `[${row.id}] ${new Date(row.created_at).toISOString()} → ${row.content}`
            ).join('\n');
            return res.json({
                response: `📋 [LOGS]:\n${formatted}`
            });
        }

        // DELETE command
        if (cmd.startsWith('delete ')) {
            const idStr = cmd.substring(7).trim();
            const id = parseInt(idStr, 10);
            if (isNaN(id)) {
                return res.json({
                    response: "❌ [ERROR]: Invalid ID format"
                });
            }
            const result = await client.query(
                "DELETE FROM logs WHERE id = $1 RETURNING id", [id]
            );
            if (result.rows.length === 0) {
                return res.json({
                    response: `❌ [ERROR]: Record ${id} not found`
                });
            }
            return res.json({
                response: `⚠️ [DELETED]: Record ${id} wiped.`
            });
        }

        // STATUS command
        if (cmd === 'status') {
            const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = uptime % 60;
            const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

            let dbStatus = "CONNECTED";
            try {
                await client.query("SELECT 1");
            } catch {
                dbStatus = "DISCONNECTED";
            }

            return res.json({
                response: `🖥️ [SYSTEM STATUS]\n` +
                    `  UPTIME: ${uptimeStr}\n` +
                    `  NODE: v25\n` +
                    `  DATABASE: ${dbStatus}\n` +
                    `  PORT: ${PORT}`
            });
        }

        // HELP command
        if (cmd === 'help') {
            return res.json({
                response: `📖 [AVAILABLE COMMANDS]\n` +
                    `  insert [text] - Store text in mainframe\n` +
                    `  view          - Display recent logs\n` +
                    `  delete [id]   - Remove record by ID\n` +
                    `  status        - System diagnostics\n` +
                    `  help          - Show this message`
            });
        }

        // Unknown command
        return res.json({
            response: `❌ [ERROR]: Unknown command "${cmd}". Type "help" for available commands.`
        });

    } catch (error) {
        console.error("❌ Command execution failed", error);
        return res.status(500).json({
            response: `❌ [CRITICAL]: Command failed - ${error.message}`
        });
    }
});

app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString()
    });
});

const serverStartTime = Date.now();

async function startServer() {
    await runSentinel();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Sentinel API running on 0.0.0.0:${PORT}`);
    });
}

startServer();

