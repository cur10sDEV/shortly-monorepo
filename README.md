<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://capsule-render.vercel.app/api?type=waving&color=0:6366f1,100:0d9488&height=200&section=header&text=Shortly&fontSize=60&fontColor=fff&fontAlignY=36">
  <img alt="Shortly" src="https://capsule-render.vercel.app/api?type=waving&color=0:6366f1,100:0d9488&height=200&section=header&text=Shortly&fontSize=60&fontColor=fff&fontAlignY=36">
</picture>

<p align="center">
  <b>A modern, self-hosted URL shortener with real-time analytics</b>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#services">Services</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

<br>

## Features

<div align="center">

| | |
|---|---|
| ✂️ **URL Shortening** | Custom short codes, password protection, expiration dates |
| 📊 **Real-time Analytics** | Click tracking, unique visitors, referrers, devices, locations |
| 🔐 **Google OAuth** | Secure sign-in with Google, session-based auth |
| ⚡ **Blazing Fast** | Redis-cached redirects, in-memory lookup |
| 🛡️ **Anti-Spam** | Ticket-based rate limiting, password-protected links |
| 🐳 **Dockerized** | One-command start, isolated services |
| 🌙 **Dark Mode** | Beautiful dark theme included |
| 🏠 **Self-Hosted** | Full control, no third-party dependencies |

</div>

<br>

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser   │────▶│  Frontend    │────▶│   API        │
│ localhost:  │     │  localhost:  │     │   localhost: │
│ 3000        │◀────│  8080        │◀────│   8080       │
└─────────────┘     └──────────────┘     └──────┬───────┘
                                                │
                     ┌──────────────────────────┼──────────┐
                     │                          │          │
                     ▼                          ▼          │
              ┌──────────────┐           ┌──────────┐     │
              │ PostgreSQL   │           │ Redis    │     │
              │ (db/         │           │ (cache)  │     │
              │  compose)    │           │          │     │
              └──────────────┘           └──────────┘     │
                     │                                     │
                     ▼                                     │
              ┌──────────────┐                             │
              │ Redirection  │◀────────────────────────────┘
              │ localhost:   │
              │ 8000         │
              └──────┬───────┘
                     │
                     ▼  (Kafka producer)
              ┌──────────────┐
              │   Kafka      │
              │  (KRaft)     │
              └──────┬───────┘
                     │
                     ▼  (Consumer)
              ┌──────────────┐     ┌──────────────┐
              │  Analytics   │────▶│Elasticsearch │
              │  Consumer    │     │ localhost:   │
              │              │     │ 9200         │
              └──────────────┘     └──────────────┘
                     │
                     ▼  (ES queries)
              ┌──────────────┐
              │   API        │
              │  (analytics  │
              │   routes)    │
              └──────────────┘
```

<br>

## Quick Start

### Prerequisites

- Docker & Docker Compose
- A Google OAuth client ID/secret (for authentication)
- 4GB+ RAM allocated to Docker

### Setup

```bash
# Clone the repository
git clone https://github.com/cur10sdev/shortly.git
cd shortly

# Configure environment variables
cp envs/.env.example.env envs/.env.db
cp envs/.env.example.env envs/.env.api
# ... configure each .env file with your Google OAuth credentials

# Start!
./start.sh
```

The script handles the full boot sequence:

1. Starts PostgreSQL (required first)
2. Waits for database readiness
3. Starts the API service (runs better-auth migrations automatically)
4. Starts Redis, Kafka, Elasticsearch, analytics consumer
5. Starts the redirection service and frontend
6. Seeds the database schema

Once running:

| Service | URL |
|---|---|
| **Frontend** | [http://localhost:3000](http://localhost:3000) |
| **API** | [http://localhost:8080](http://localhost:8080) |
| **Redirection** | [http://localhost:8000](http://localhost:8000) |
| **Elasticsearch** | [http://localhost:9200](http://localhost:9200) |
| **PostgreSQL** | `localhost:5432` |

```bash
# Stop all services
./stop.sh
```

<br>

## Services

### Frontend (`frontend/`)

A React SPA built with TanStack Router and Query. Features an indigo-teal design system with dark mode, card-based link management, and real-time analytics dashboards with interactive charts.

```
Stack: React 19 · TanStack Router · TanStack Query · Tailwind v4 · Recharts
```

### API Service (`api-service/`)

The backend API gateway using Hono. Handles authentication via better-auth (Google OAuth), link CRUD operations, and serves analytics data queried from Elasticsearch.

```
Stack: Hono · better-auth · PostgreSQL · @elastic/elasticsearch
```

### Redirection Service (`redirection-service/`)

High-performance URL redirection engine. Resolves short codes from Redis cache (or PostgreSQL on miss), publishes click events to Kafka for analytics, and supports password-protected links.

```
Stack: Hono · Redis (ioredis) · PostgreSQL · Kafka (kafkajs)
```

### Ticket Service (`ticket-service/`)

Anti-spam rate limiting service. Issues time-limited tickets that must accompany create-link requests, preventing abuse by unauthenticated or automated clients.

```
Stack: Hono · PostgreSQL
```

### Analytics Consumer (`analytics-consumer/`)

Background worker that consumes click events from Kafka, enriches them with user-agent parsing (browser, OS, device type) and GeoIP resolution, then indexes them into Elasticsearch for querying.

```
Stack: Kafka (kafkajs) · ua-parser-js · Elasticsearch (@elastic/elasticsearch)
```

### Base62 Encoder/Decoder (`base_62_encoder_decoder/`)

[![npm version](https://badge.fury.io/js/base62-encoder-decoder.svg)](https://badge.fury.io/js/base62-encoder-decoder)

A high-performance base62 encoder/decoder NPM package with BigInt support. Generates compact, URL-safe short codes from numeric IDs.

```
Stack: TypeScript · npm package
```

<br>

## Tech Stack

<div align="center">

| Category | Technology |
|---|---|
| **Frontend** | React 19, TanStack Router, TanStack Query, Tailwind CSS v4, Recharts, Lucide Icons |
| **Backend** | Hono (TypeScript), better-auth, PostgreSQL 18 |
| **Infrastructure** | Docker Compose, Redis 7, Apache Kafka 4 (KRaft), Elasticsearch 8 |
| **Analytics** | Kafka (event pipeline), Elasticsearch (storage + queries), ua-parser-js (UA parsing), ip-api.com (GeoIP) |
| **Auth** | Google OAuth 2.0, session cookies (SameSite=None; Secure), AES-256 encrypted state |

</div>

<br>

## Screenshots

> Coming soon — screenshots will be added after UI stabilization.

<br>

## License

MIT

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://github.com/cur10sDEV">cur10sdev</a></sub>
</p>
