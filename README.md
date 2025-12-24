# Orchestrator - Try it TODAY! https://orchestrator-api-apto.onrender.com/

> A containerized data storage API built with Node.js, Express, and PostgreSQL.

---

## 🎯 Purpose

This is a flexible API that allows you to store and retrieve data in a PostgreSQL database with JSONB support, enabling storage of any JSON structure.

---

## ✨ Features

- **Flexible JSONB storage** - Store any JSON data structure without predefined schemas
- **RESTful API** - Standard HTTP endpoints for full CRUD operations
- **Docker-based deployment** - Containerized for easy setup and portability
- **Type-based filtering** - Organize and retrieve data by custom categories

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed
- Copy `.env.example` to `.env` and configure your environment variables

### Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd orchestrator

# Configure environment
cp .env.example .env

# Start the containers
docker compose up -d

# Verify it's running
curl http://localhost:9000/health
```

---

## 📡 API Documentation

### Docker Management
```bash
# Start the containers
docker compose up -d

# Stop the containers
docker compose down

# View logs
docker compose logs -f backend

# Restart after code changes
docker compose restart backend
```

*(Alternatively, use the Docker Desktop UI)*

---

### API Endpoints

Replace `APP_PORT` with your configured port (default: `9000`)

#### **Health Check**
```bash
curl http://localhost:APP_PORT/health
```

---

#### **Create Entry**
```bash
curl -X POST http://localhost:APP_PORT/save \
  -H "Content-Type: application/json" \
  -d '{"type":"YOUR_TYPE","data":{"YOUR":"DATA"}}'
```

**Example:**
```bash
curl -X POST http://localhost:9000/save \
  -H "Content-Type: application/json" \
  -d '{"type":"price","data":{"product":"RTX 4090","price":1599}}'
```

**Response:**
```json
{
  "message": "✅ Data saved successfully",
  "entry": {
    "id": 1,
    "type": "price",
    "created_at": "2025-12-24T19:22:19.431208+00:00"
  }
}
```

---

#### **Get All Entries**
```bash
curl http://localhost:APP_PORT/orchestrator
```

Returns the last 100 entries, ordered by most recent.

---

#### **Get Entries by Type**
```bash
curl http://localhost:APP_PORT/orchestrator/type/YOUR_TYPE
```

**Example:**
```bash
curl http://localhost:9000/orchestrator/type/price
```

---

#### **Get Entry by ID**
```bash
curl http://localhost:APP_PORT/orchestrator/:id
```

**Example:**
```bash
curl http://localhost:9000/orchestrator/1
```

---

#### **Delete Entry**
```bash
curl -X DELETE http://localhost:APP_PORT/orchestrator/:id
```

**Example:**
```bash
curl -X DELETE http://localhost:9000/orchestrator/1
```

**Response:**
```json
{
  "message": "✅ Entry deleted successfully",
  "deleted": {
    "id": 1,
    "type": "price"
  }
}
```

---

## 🛠️ Tech Stack

- **Node.js 25** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL 18** - Relational database with JSONB support
- **Docker & Docker Compose** - Containerization
- **Adminer** - Database management UI (accessible at `localhost:8080`)

---

## 💡 Use Cases

- **Price Tracking** - Monitor product prices over time
- **Web Scraping** - Store scraped data with metadata
- **Personal Archives** - Save notes, bookmarks, or documents
- **Application Logging** - Structured log storage
- **IoT Data Collection** - Store sensor readings
- **Any structured data storage needs**

---

## 📊 Database Schema
```sql
CREATE TABLE orchestrator (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50),
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📝 License

MIT

---

## 📚 Resources

- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [Docker Compose](https://docs.docker.com/compose/)
- [Node.js pg Library](https://node-postgres.com/)
