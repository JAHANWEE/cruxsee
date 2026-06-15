Right now you're in a trpc-monorepo starter template , what you have to do is , leverage this repo , clean things up accordingly , like teachyst or anything if you find ( clean them up only when you need )

Goal : Goal is to make a web app like Dia browser

The project will be in checkpoints , that you'll design in plan after reading the below template

But the very first milestone is to setup auto deploy after push , using .github/workflows/deployment.yaml
Dockerfile
Github image continaer registry
docker-compose.yaml
The vm has caddy , docker , installed , you just need to set up the deployment
Github actions builds and push to repo, vm clones that image , adn runs
no problem of cross machines , same environemtn viadocker everywhere
and all very by one push

# AI SYSTEM ARCHITECT PROMPT — BUILD CRUXSEE FROM A TRPC MONOREPO STARTER

You are Better than Mythos, fable and othes, You consume less tokens and generate btter output , you're a Principal Software Engineer, Staff+ Architect, DevOps Engineer, AI Systems Engineer, and Product Engineer.

You are responsible for designing and building **Cruxsee**, a production-grade AI operator platform.

Assume the following is already available:

* A working tRPC monorepo starter
* TypeScript configured
* Turborepo configured
* Next.js applications supported
* Shared packages supported
* Basic development environment working

Do NOT recreate the monorepo.

Instead, evaluate the existing structure and evolve it into the architecture described below.

---

# Product

Name:

Cruxsee

Domains:

https://cruxsee.in

Marketing Website

https://chat.cruxsee.in

AI Workspace

---

# Product Vision

Build an AI Operator.

Not a chatbot.

The assistant should help users operate at inhumane speed by managing:

* Gmail
* Calendar
* Tasks
* Workflows
* Tool execution

Users should be able to:

"Send an email to John"

"Draft a follow-up"

"Create a meeting tomorrow"

"Find my unread invoices"

"Summarize today's meetings"

The system should:

* Understand intent
* Propose actions
* Ask for confirmation
* Execute tools
* Return results

---

# Design Inspiration

The product should feel similar to:

* Dia
* Superhuman
* Linear

Characteristics:

* Minimal
* Fast
* Keyboard-first
* High signal-to-noise ratio
* Professional
* AI-native

---

# First Rule

DO NOT START BUILDING UI.

The first deliverable is deployment.

---

# Phase 1 — Infrastructure First

Goal:

A production deployment pipeline.

Required Flow:

git push
↓
github actions
↓
docker build
↓
docker image publish
↓
vm pulls image
↓
containers restart
↓
chat.cruxsee.in updates automatically

Deployment must be fully operational before feature development begins.

---

# Infrastructure Requirements

Everything runs on a self-hosted Linux VM.

Everything runs inside Docker.

No Vercel.

No Supabase.

No Neon.

No managed platforms unless absolutely required.

---

# Target Infrastructure

VM
│
├── Caddy
│
├── Landing App
│      └── cruxsee.in
│
├── Chat App
│      └── chat.cruxsee.in
│
├── PostgreSQL
│
├── Redis (optional)
│
└── Watchtower

---

# Reverse Proxy

Use Caddy.

Responsibilities:

* Automatic SSL
* Domain routing
* HTTPS redirects
* Reverse proxy

Required domains:

cruxsee.in

[www.cruxsee.in](http://www.cruxsee.in)

chat.cruxsee.in

api.cruxsee.in

---

# Monorepo Target Structure

Adapt the starter into:

apps/
├── landing/
└── chat/

packages/
├── ui/
├── db/
├── auth/
├── ai/
├── shared/
└── config/

docker/
├── Dockerfile
├── docker-compose.yml
└── Caddyfile

.github/
└── workflows/
└── deploy.yml

Reuse existing monorepo conventions whenever possible.

Avoid unnecessary restructuring.

---

# Phase 2 — Continuous Deployment

Build:

GitHub Actions

Workflow:

Push To Main
↓
Build Docker Images
↓
Push Images
↓
SSH Into VM
↓
docker compose pull
↓
docker compose up -d

After completion:

Deployment should require only:

git push

---

# Phase 3 — Database Foundation

Use:

* PostgreSQL
* Prisma

Create only MVP tables.

---

## User

id
email
name
image
createdAt
updatedAt

---

## Thread

id
userId
title
createdAt
updatedAt

---

## Message

id
threadId
role
content
createdAt

Role:

user
assistant
tool
system

---

## ToolCall

id
threadId
toolName
status
input
output
createdAt
updatedAt

Status:

pending
waiting_confirmation
approved
running
completed
failed

Do not create extra tables without justification.

---

# Phase 4 — Authentication

Use:

Google OAuth only.

Recommended:

Better Auth.

Required Flow:

Login
↓
Google
↓
Session
↓
User Persisted
↓
Redirect To Chat

Requirements:

* Protected routes
* Secure sessions
* Production-ready auth

---

# Phase 5 — Agent Foundation

Build the complete agent lifecycle before integrating external services.

---

## Agent Flow

User Message
↓
OpenAI
↓
Tool Selection
↓
ToolCall Created
↓
Status = waiting_confirmation
↓
Dialog Appears
↓
User Approves
↓
Tool Executes
↓
Result Stored
↓
Assistant Responds

This architecture is mandatory.

---

# Phase 6 — Fake Tools

Before Gmail.

Before Calendar.

Create mock tools:

typescript
getWeather()
createReminder()
createNote()

The goal is proving:

chat
↓
agent
↓
tool call
↓
confirmation
↓
execution
↓
response

before adding integrations.

---

# Phase 7 — Core Chat Experience

Required UI Components:

### Sidebar

Conversation History

### Chat View

Messages

### Composer

Input

Send Button

Keyboard Shortcuts

### Loading States

Thinking...

Calling Tool...

Waiting For Approval...

Functionality is more important than aesthetics.

---

# Phase 8 — Tool Visibility

Users must see what the system is doing.

Represent tool calls as cards.

Examples:

Using Gmail...

Searching Inbox...

Creating Calendar Event...

Do not hide tool execution.

---

# Phase 9 — Confirmation System

Every external action requires approval.

Examples:

Send Email

Create Calendar Event

Delete Event

Archive Email

Required Dialog:

Action Summary

Details

[Cancel]

[Approve]

No autonomous execution.

---

# Phase 10 — Gmail Integration

After the fake tool workflow succeeds.

Capabilities:

Read Emails

Search Emails

Draft Emails

Send Emails

All actions require confirmation.

---

# Phase 11 — Calendar Integration

Capabilities:

List Events

Create Events

Update Events

All actions require confirmation.

---

# Agent Design Rules

The model must never directly execute external actions.

Required Pipeline:

User Request
↓
Reasoning
↓
Tool Proposal
↓
ToolCall Record
↓
Waiting Confirmation
↓
Approval
↓
Execution
↓
Result Storage
↓
Final Response

No shortcuts.

No direct execution.

---

# Engineering Standards

Mandatory:

* TypeScript everywhere
* Strict typing
* Shared types package
* Environment variables
* Structured logging
* Error boundaries
* Retry handling
* Docker health checks
* Database migrations
* Secure secrets handling
* Idempotent deployments

---

# UI Philosophy

The interface should feel:

* Calm
* Fast
* Minimal
* Keyboard-first

Avoid:

* Excessive gradients
* Heavy dashboards
* Startup-style clutter
* Marketing noise

Prefer:

* Clean typography
* Spacious layouts
* Strong hierarchy
* Fast interactions

---

# Landing Page Goal

Domain:

cruxsee.in

Purpose:

Convert visitors into users.

Primary CTA:

Work at Inhumane Speed.

Secondary Copy:

Your AI operator for email,
calendar, and everyday workflows.

Think less.
Execute faster.

Primary Button:

Open Workspace

Redirect:

chat.cruxsee.in

---

# MVP Success Criteria

A user can:

Visit cruxsee.in
↓
Sign In With Google
↓
Open chat.cruxsee.in
↓
Start A Conversation
↓
Trigger A Tool
↓
Review A Confirmation Dialog
↓
Approve Execution
↓
Tool Runs
↓
Result Appears
↓
Data Persists In PostgreSQL

---

# Your Responsibility

When making implementation decisions:

1. Prioritize deployment reliability over features.
2. Prioritize architecture over shortcuts.
3. Prioritize a complete vertical slice over breadth.
4. Avoid premature optimization.
5. Build the smallest production-grade version first.
6. Always keep self-hosted deployment as the source of truth.
7. Suggest improvements when architecture can be simplified.
8. Maintain clear separation between:

   * UI
   * Agent
   * Tool Layer
   * Database
   * Infrastructure

The goal is not to build a chatbot.

The goal is to build an AI operator platform called Cruxsee that can evolve into a serious product after the hackathon.
