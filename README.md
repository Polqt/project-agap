# Project Agap

Project Agap is a disaster risk reduction and response platform built for barangays, responders, and residents. It is designed for the moments when ordinary communication becomes unreliable but the need for accurate coordination becomes even more urgent.

At its core, Project Agap helps a community answer the questions that matter most during an emergency:

- Who is safe?
- Who still needs help?
- Which households remain unaccounted for?
- Where should people evacuate?
- What resources are needed right now?
- How can officials keep response moving even under weak connectivity?

## Why Project Agap Matters

Disasters do not wait for stable internet, complete information, or ideal operating conditions. Floods, earthquakes, storms, and forced evacuations create a gap between what people need to report and what systems are still capable of receiving.

Project Agap is built to close that gap.

Instead of treating connectivity loss as a failure state, the platform is designed around continuity:

- residents can still report safety status quickly
- officials can continue operations from mobile in the field
- command staff can maintain barangay-wide visibility from the web
- map, routing, alerts, and cached records remain useful even when live services degrade
- weak connections are treated as recoverable, not immediately lost

## The Platform

Project Agap has two connected experiences:

- [Project Agap Mobile](./apps/native/README.md)
- [Project Agap Web Command Center](./apps/web/README.md)

Together, they form one emergency workflow across residents, responders, and decision-makers.

## Core Capabilities

### Resident Safety Reporting

- one-tap `I Am Safe` and `I Need Help` status updates
- household visibility and last-ping state
- emergency reporting designed for speed and clarity

### Barangay Command And Coordination

- dashboard for accountability and response KPIs
- unresolved help queue for immediate action
- household registry and evacuation status management
- welfare assignment and follow-up tracking
- center operations, occupancy, and supplies monitoring

### Emergency Communication

- barangay-wide and purok-targeted broadcasts
- app and SMS-supported communication workflows
- communication history and delivery visibility

### Evacuation Mapping And Guidance

- evacuation center discovery
- safer-center route ranking
- traffic-aware route guidance when available
- seeded route fallback when live routing is unavailable
- offline map pack support for cached routes, alerts, and center data

### Offline And Weak-Connectivity Resilience

- local-first mobile read model
- queued write recovery when live delivery is impossible
- weak-connectivity retry before queue fallback
- conflict-aware mobile recovery for official workflows
- freshness indicators so users understand what is live, stale, or pending sync

## What Makes It Competition-Ready

Project Agap is not just a reporting tool. It is a coordination system built for real emergency constraints:

- it supports both residents and officials
- it bridges field action and command oversight
- it treats mapping, communication, and accountability as one integrated problem
- it remains usable during unstable network conditions
- it is tailored to barangay-level response, where timing and clarity have immediate consequences

## Explore The Experience

- Mobile field app: [apps/native/README.md](./apps/native/README.md)
- Web command center: [apps/web/README.md](./apps/web/README.md)
