Strategic Intelligence Stack

A Production-Grade Customer Segmentation & Decision Intelligence Platform

What This Project Is

Strategic Intelligence Stack is a real-world, production-grade customer segmentation and decision intelligence system designed to bridge the gap between machine learning outputs and actual business decisions.

It is not a toy dashboard, a static ML notebook, or a one-off demo.

This system is built to:

Accept real business datasets

Generate repeatable customer segmentation

Convert clusters into actionable insights and personas

Allow what-if business simulations

Deliver executive-ready outputs through a web interface

The platform is dataset-driven and reusable — the same system can be applied to different clients, industries, and datasets without code changes.

Why This Exists (Problem Statement)

Most customer segmentation projects fail after model training because:

Clusters are not interpretable by business teams

Insights are disconnected from decisions

Results are static and non-reproducible

Outputs are hard to operationalize

This project solves that by treating segmentation as a product, not a notebook.

Core Capabilities
1. Customer Segmentation (ML Pipeline)

Feature validation and preprocessing

Clustering-based segmentation

Persisted segmentation runs

Deterministic re-runs using run IDs

Production-ready model storage

2. Business Insight Generation

Revenue contribution vs customer share

Promotion responsiveness analysis

Discount addiction risk detection

Channel preference profiling

Cluster-level persona synthesis

3. Interactive Analytics Dashboard

Executive overview

Segment comparisons

Interactive charts and tables

Designed for decision-makers, not analysts

Works with demo data or uploaded datasets

4. Simulation Engine

What-if simulations on strategy levers

Cluster-aware simulation logic

Immediate feedback without retraining models

Designed for planning, not experimentation only

5. Export & Reporting

Executive-ready PDF exports

Print-optimized layouts

Deterministic reports tied to a run state

Suitable for leadership reviews and client delivery

System Architecture (Pointwise)
End-to-End Flow

User opens the web dashboard (Vercel-hosted frontend)

User selects:

Demo mode (preloaded dataset)

Upload mode (custom business data)

Frontend sends typed REST requests to the backend

Backend:

Validates dataset

Runs segmentation pipeline

Generates insights and personas

Stores outputs under a unique run ID

Frontend renders dashboards from run results

User runs simulations or exports reports

Architectural Responsibilities

Frontend

Visualization and interaction

State management per run

Simulation controls

Export orchestration

Backend

Machine learning pipeline

Insight and persona generation

Simulation engine

Run lifecycle management

Storage

Persisted run artifacts

Model bundles

Reproducible outputs

Technology Stack
Frontend

Next.js (App Router)

React + TypeScript

Recharts for analytics visualization

Tailwind CSS for design system

Puppeteer for server-side PDF generation

Deployed on Vercel

Backend

Python 3

FastAPI

Pydantic for schema validation

Scikit-learn for ML pipelines

Joblib for model persistence

Deployed on Render

Frontend Structure (Pointer Format)

Location: src/components/dashboard

charts

BICharts.tsx – analytical visualizations

ChartCard.tsx – reusable chart container

exports

ExportPdfButton.tsx – export trigger

ExportsTab.tsx – export workflow

exportPayload.ts – structured export state

overview

Overview.tsx – executive summary

DecisionBanner.tsx – key decisions

SegmentCompare.tsx – cluster comparison

TopSegmentSpotlight.tsx – best segments

simulation

Simulation.tsx – what-if analysis

SliderRow.tsx – simulation inputs

simulationAdapters.ts – backend mappings

tables

DataTable.tsx – reusable tables

SegmentsTab.tsx – segmentation tables

PersonasTab.tsx – personas

TablesTab.tsx – orchestration

layout

Header.tsx – global header

Tabs.tsx – navigation

SummaryCards.tsx – KPIs

shared

constants.ts

types.ts

utils.ts

Backend Structure (Pointer Format)

Location: backend/app

core

clustering.py – segmentation logic

pipeline.py – orchestration

insights.py – business insights

personas.py – persona generation

simulation.py – simulation engine

simulation_clusters.py – cluster logic

recompute.py – reruns

train_production.py – model training

validation.py – data validation

ttl.py – run lifecycle

model_store.py – model registry

visuals.py – chart-ready outputs

storage

runs/<run_id>/ – persisted artifacts

data

sample datasets

models

persisted model bundles

API Layer

main.py – FastAPI entrypoint

schemas.py – request/response models

API Access

Live API:
https://strategic-intelligence-stack.onrender.com

Swagger Docs:
https://strategic-intelligence-stack.onrender.com/docs

The API supports:

Health checks

Dataset uploads

Demo and production runs

Cluster insights

Simulations

Run manifests and exports

Design Principles

Production-first (not notebook-first)

Reproducibility over randomness

Business interpretability over raw metrics

Separation of concerns

Reusable across clients and datasets

Intended Use Cases

Marketing strategy optimization

Customer lifecycle management

Promotion and pricing planning

Consulting and analytics delivery

Executive decision support systems

Deployment Status

Frontend CI validated and deployed

Backend live with documented APIs

End-to-end workflow operational

Ready for real-world datasets

Author

Pranav Gujjar
ML Engineer