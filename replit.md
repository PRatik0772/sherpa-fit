# Sherpa Fit - AI Nutrition & Fitness Tracker (Mobile App)

## Overview
Sherpa Fit is an AI-powered mobile application for comprehensive nutrition and fitness tracking. It offers features like food scanning, AI-driven meal logging, macro and micronutrient tracking, hydration monitoring, and a workout library with 3D muscle highlighting. The app provides personalized meal plans for Indian, Nepali, and Chinese cuisines, leveraging extensive datasets of fitness profiles, food nutrients, and branded products with Nutri-Score grades. The business vision is to deliver a culturally sensitive and intelligent health companion, aiming to capture a significant share of the global personalized wellness market.

## User Preferences
- Mobile-first app (targeting App Store / Play Store)
- Color palette: white, blue (#2563eb), orange (#f97316) - orange gradient headers, blue accents
- Premium fonts: Space Grotesk (display/headings via font-display), DM Sans (body via font-body)
- iOS-native design patterns with proper gestures and animations
- Floating bottom nav (Today/Plan/FAB/Stats/Profile) with central orange FAB (+) for quick actions (Log Meal, Scan Food, Log Exercise, Log Water)
- AirPods-style expandable NutritionSheet bottom popup showing real-time calorie/water/macro tracking
- Apple Fitness-style dashboard with triple rings and macro nutrition grid
- Support for Indian, Nepali, Chinese cuisines
- 3D muscle highlighting for exercises
- Data-driven AI recommendations
- Haptic feedback on interactions

## System Architecture
The application is designed as a mobile-first experience, utilizing Capacitor for native iOS and Android wrapping.

**Frontend:**
- **Technology Stack:** React, Vite, Tailwind CSS, shadcn/ui.
- **UI/UX Design:** Employs an emerald/teal color palette, replacing the previous royal blue/red, for a modern Apple Fitness-inspired aesthetic. Uses premium fonts (Cormorant Garamond for headings, DM Sans for body) and incorporates iOS-native design patterns with spring animations and gesture-based interactions.
- **Navigation:** Wouter for routing and React Context for state management. Features a 3-tab bottom navigation (Today/Journey/Log/Profile) with a floating FAB for quick actions. A `JourneyGate` routing system manages user navigation based on their state (role, onboarding, plan status).
- **Dashboard:** Features an Apple Fitness-style dashboard with triple rings (Move/Active/Water), metrics strip, workout cards, and weekly charts. The `DashboardJourney` view provides a plan viewer with tabs for Meals, Workout, Water, and Grocery.
- **Key Features:** Includes AI-powered conversational plan creation via "Jung Coach", an 8-stage plan creation pipeline, activity logging, and a Workout of the Day (WOD) feature with video demonstrations.

**Backend:**
- **Technology Stack:** Express.js with TypeScript.
- **Database:** PostgreSQL with Drizzle ORM for data persistence.
- **AI Integration:** Gemini AI via Replit AI Integrations for food analysis, conversational interactions ("Jung Coach"), and smart recommendations.
- **Security:** Implements HMAC-signed Bearer token authentication and robust middleware for route protection and ownership checks.
- **Core Functionality:** Provides API endpoints for user authentication, personalized plan generation, meal and water logging, exercise management, coach-client messaging, and comprehensive user profile and analytics management.

**AI/ML:**
- **Nutrition Intelligence:** Utilizes a custom Food Nutrition Database (2,395 foods, 35 nutrients) and integrates with Open Food Facts (100,000 products, Nutri-Score A-E).
- **Fitness Intelligence:** Employs a fitness dataset (1,324 profiles) for calorie prediction, heart rate targets, and AI coaching.
- **Personalization:** AI chat capabilities, powered by Gemini 2.5 Flash, are enhanced with real-time database lookups and contextual understanding from all datasets to provide accurate and personalized recommendations for plan generation and user interaction.

## External Dependencies
- **Capacitor:** Native wrapper for iOS and Android.
- **PostgreSQL:** Primary database.
- **Drizzle ORM:** Object-Relational Mapper.
- **Gemini AI (via Replit AI Integrations):** For AI functionality and conversational interfaces.
- **bcrypt:** For password hashing.
- **Open Food Facts API:** For branded product data and Nutri-Score grades.
- **@capacitor/haptics:** For haptic feedback.
- **Capacitor Core Plugins:** For status bar, splash screen, push notifications, sharing, and keyboard management.
- **React Three Fiber:** For 3D rendering (e.g., MuscleViewer3D).