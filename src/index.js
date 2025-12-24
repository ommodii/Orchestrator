const { Client } = require("pg");
const express = require("express");

const app = express();
const PORT = 9000;
app.use(express.json());

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST || "db",
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
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

app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString()
    });
});

async function startServer() {
    await runSentinel();
    app.listen(PORT, () => {
        console.log(`🚀 Sentinel API running on port ${PORT}`);
    });
}

startServer();

