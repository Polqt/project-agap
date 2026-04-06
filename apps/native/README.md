# Project Agap Mobile

Project Agap Mobile is the field experience of the platform. It is the app used directly by residents, barangay officials, and response teams during emergencies, when decisions need to happen fast and connectivity cannot be assumed.

Back to the platform overview: [Project Agap](../../README.md)  
See the command center: [Project Agap Web Command Center](../web/README.md)

## Purpose

The mobile app is designed to keep disaster response moving at the point where information is first created: on the phone of a resident asking for help, an official checking household status, or a responder coordinating evacuation and welfare operations in the field.

This is not a passive companion app. It is an operational tool built for action.

## Resident Experience

For residents, the app focuses on immediate reporting, guidance, and reassurance.

- one-tap `I Am Safe` and `I Need Help` reporting
- visibility of the latest status and sync state
- evacuation center discovery and route guidance
- QR and manual evacuation center check-in
- access to active alerts and barangay broadcasts
- map support for navigation under emergency conditions

## Official Field Experience

For barangay officials, the same mobile app becomes a portable command surface.

- command dashboard with accountability indicators
- unresolved help ping monitoring
- registry and household evacuation status updates
- welfare visit assignment and outcome recording
- evacuation center open/close controls
- center QR rotation and supply tracking
- mobile broadcast composition

## Map And Evacuation Guidance

The map is one of the most critical parts of the mobile experience.

- identifies available evacuation centers
- ranks routes toward safer destinations
- uses traffic-aware routing when the network can support it
- falls back to seeded barangay guidance when live routing is unavailable
- supports cached map packs for routes, alerts, and center data
- allows pinned home or reference location for repeated use

The goal is not just to show a map, but to support evacuation decisions under pressure.

## Offline-First And Weak-Link Ready

Project Agap Mobile is built around the operational reality that disaster networks often become unstable before information stops mattering.

- critical reads come from local device storage
- major mobile actions can recover after reconnect
- weak connectivity is treated as a live-send condition first, not an immediate failure
- queued recovery remains available when delivery becomes impossible
- sync freshness is visible so the user understands whether data is current, cached, or pending

This means the app remains usable in the field even when connectivity is degraded, intermittent, or recovering.

## Why The Mobile App Stands Out

Project Agap Mobile combines several emergency functions that are often separated into different tools:

- resident reporting
- official field coordination
- mapping and evacuation guidance
- welfare operations
- center management
- communication and alerts
- offline resilience

That combination is what makes it strong for barangay-level response: one mobile experience that remains practical for both citizens and responders.

## Continue Exploring

- Platform overview: [../../README.md](../../README.md)
- Web command center: [../web/README.md](../web/README.md)
