Strategic Intelligence Stack

Production-Grade Customer Segmentation & Decision Intelligence Platform

Overview

Strategic Intelligence Stack is a full-stack, production-ready customer segmentation and decision intelligence platform designed for real-world business use cases.
It enables organizations to upload their own datasets, generate customer segments using machine learning, derive actionable business insights, simulate strategic decisions, and export executive-ready outputs — all in near real time.

The system is fully decoupled, with:

A FastAPI-based backend responsible for data processing, machine learning, simulations, and insight generation.

A Next.js + TypeScript frontend delivering a rich analytics dashboard, interactive visualizations, and export workflows.

The platform is designed to be dataset-agnostic: the same application can be reused across different clients and industries by uploading new data, without code changes.

Live Deployments
Frontend (Vercel)

https://strategic-intelligence-stack-5fqtskraq-pranav-gujjars-projects.vercel.app

Backend API (Render)

https://strategic-intelligence-stack.onrender.com

Backend API Documentation (Swagger)

https://strategic-intelligence-stack.onrender.com/docs

Key Capabilities
1. Customer Segmentation (ML-Driven)

Automated clustering pipeline for customer segmentation

Feature normalization and validation

Persisted segmentation runs with unique run IDs

Reproducible results per dataset and configuration

2. Business Insights & Personas

Segment-level insights (value, risk, responsiveness)

Automatically generated customer personas

Strategic interpretations designed for decision-makers

3. Interactive Analytics Dashboard

Revenue vs customer share analysis

Promotion response comparison

Discount addiction risk visualization

Channel mix strategy (web / store / catalog)

High-density, executive-ready charts and tables

4. Simulation Engine

What-if simulations on pricing, promotions, and strategy

Cluster-aware simulation logic

Immediate feedback in the UI without re-training

5. Export & Reporting

Executive-ready PDF export

Structured, print-optimized dashboards

Deterministic report generation tied to run state

6. Production-Grade Architecture

CI-validated frontend builds

Typed contracts across frontend ↔ backend

Stateless APIs with persistent run storage

Designed for scale, reuse, and client customization

High-Level System Architecture (Pointwise)
A) End-to-End Flow

User opens the web dashboard (Vercel)

User selects:

Demo mode (preloaded dataset)

Upload mode (custom dataset)

Frontend sends REST requests to FastAPI backend

Backend performs:

Dataset validation

Feature engineering

Segmentation & scoring

Insight and persona generation

Results are persisted under a unique run ID

Frontend renders dashboards, charts, and tables

User optionally runs simulations

User exports executive-ready outputs

B) Responsibility Separation

Frontend

UI rendering and navigation

Visualization and interaction

Export triggering and report pages

Strict TypeScript contracts

Backend

Machine learning pipeline

Simulation engine

Business insight generation

Run lifecycle management

Storage

Run-scoped outputs

Model artifacts

Deterministic replay of results

Frontend Technology Stack

Next.js (App Router)

React + TypeScript

Recharts (data visualization)

Tailwind CSS (design system)

Vercel (deployment & CI)

Puppeteer (server-side PDF rendering)

Backend Technology Stack

Python 3

FastAPI

Pydantic (schema validation)

Scikit-learn (ML pipelines)

Joblib (model persistence)

Render (deployment)

Frontend Structure (Pointer Format)

Root: src/components/dashboard

charts/

BICharts.tsx – analytical visualizations

ChartCard.tsx – reusable chart container

exports/

ExportPdfButton.tsx – export trigger

ExportsTab.tsx – export UI

exportPayload.ts – structured export state

overview/

Overview.tsx – executive overview

DecisionBanner.tsx – key decision highlights

SegmentCompare.tsx – segment comparison

TopSegmentSpotlight.tsx – best-performing segments

simulation/

Simulation.tsx – what-if analysis

SliderRow.tsx – simulation controls

simulationAdapters.ts – backend ↔ frontend mapping

tables/

DataTable.tsx – reusable table component

SegmentsTab.tsx – segment data

PersonasTab.tsx – persona insights

TablesTab.tsx – tab orchestration

layout/

Header.tsx – global header

Tabs.tsx – navigation

SummaryCards.tsx – KPI summaries

shared

constants.ts

types.ts

utils.ts

Backend Structure (Pointer Format)

Root: backend/app

core/

clustering.py – segmentation logic

pipeline.py – end-to-end orchestration

insights.py – business insight generation

personas.py – persona synthesis

simulation.py – scenario engine

simulation_clusters.py – cluster-aware simulations

recompute.py – rerun logic

train_production.py – model training

validation.py – dataset checks

ttl.py – run lifecycle management

model_store.py – model loading & registry

visuals.py – chart-ready outputs

storage/

runs/<run_id>/ – persisted results

data/

marketing_campaign.xlsx (sample dataset)

models/

customer_segmentation_bundle_v1.joblib

API Layer

main.py – FastAPI entrypoint

schemas.py – request/response contracts

API Capabilities (Summary)

Health checks

Dataset upload & preview

Demo and production runs

Cluster summaries and insights

Simulation execution

Manifest and result retrieval

Scored output downloads

Full API details available at /docs.

Design Philosophy

Production-first: no demo-only shortcuts

Dataset-agnostic: reuse across clients

Deterministic outputs: reproducibility guaranteed

Separation of concerns: clean frontend/backend boundary

Decision-centric: analytics built for business outcomes, not just charts

Intended Use Cases

Marketing strategy optimization

Customer lifecycle management

Promotion and pricing simulations

Executive reporting and planning

Consulting and analytics delivery platforms

Status

Frontend CI validated and deployed

Backend live with documented APIs

End-to-end workflow operational

Ready for real-world datasets and extensions

Author
Pranav Gujjar
ML Engineer