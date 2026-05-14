import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertMealLogSchema, insertWaterLogSchema, insertWorkoutLogSchema, insertInviteCodeSchema, insertCoachPlanSchema } from "@shared/schema";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { GoogleGenAI } from "@google/genai";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { generateRuleBasedPlan } from "./planGenerator";
const AUTH_SECRET = process.env.SESSION_SECRET || process.env.REPL_ID || "sherpa-fit-secret";

function createAuthToken(userId: string): string {
  const hmac = crypto.createHmac("sha256", AUTH_SECRET);
  hmac.update(userId);
  return `${userId}.${hmac.digest("hex").slice(0, 16)}`;
}

function verifyAuthToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [userId, sig] = parts;
  const hmac = crypto.createHmac("sha256", AUTH_SECRET);
  hmac.update(userId);
  const expected = hmac.digest("hex").slice(0, 16);
  return sig === expected ? userId : null;
}

const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  const userId = verifyAuthToken(token);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const user = await storage.getUser(userId);
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  req.authUser = user;
  next();
};

const requireRole = (...roles: string[]): RequestHandler => {
  return async (req: any, res, next) => {
    const user = req.authUser;
    if (!user || !roles.includes(user.role || 'client')) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }
    next();
  };
};

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
  },
});

function sanitizeAiError(err: any): string {
  const raw = err?.message || "Unknown error";
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.fault?.faultstring) return "AI service is temporarily unavailable. Please try again in a moment.";
    if (parsed?.error?.message) return parsed.error.message;
    if (parsed?.message) return parsed.message;
  } catch {}
  if (raw.includes("ApiKeyNotApproved") || raw.includes("ApiKey not approved")) return "AI service is temporarily unavailable. Please try again in a moment.";
  if (raw.includes("timed out")) return "Plan generation timed out. Please try again.";
  if (raw.includes("quota") || raw.includes("RESOURCE_EXHAUSTED")) return "AI service is busy right now. Please wait a minute and try again.";
  if (raw.includes("JSON")) return "AI returned an unexpected response. Please try again.";
  return "Something went wrong generating your plan. Please try again.";
}

function buildPlanPrompt(profile: any, waterTarget: number): string {
  const cuisines = (profile.cuisines || ["Indian"]).join(", ");
  const allergies = (profile.allergies || []).join(", ") || "none";
  const dislikes = (profile.dislikes || []).join(", ") || "none";
  const equipment = (profile.equipmentAvailable || []).join(", ") || "bodyweight only";
  const injuries = profile.injuriesLimitations || "none";
  const weight = profile.weightKgCurrent || 70;
  const targetWeight = profile.weightKgTarget || weight;
  const goal = profile.goalDescription || "maintain fitness";
  const diet = profile.dietaryPreferences || "non-veg";
  const activity = profile.activityLevel || "moderate";
  const budget = profile.budgetLevel || "medium";
  const cookTime = profile.cookingTimeAvailable || 30;
  const timelineDays = profile.goalTimelineDays || 90;

  const bmr = profile.gender === "Female"
    ? 447.593 + (9.247 * weight) + (3.098 * (profile.heightCm || 165)) - (4.330 * (profile.age || 25))
    : 88.362 + (13.397 * weight) + (4.799 * (profile.heightCm || 170)) - (5.677 * (profile.age || 25));
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2, lightly_active: 1.375, light: 1.375,
    moderate: 1.55, moderately_active: 1.55,
    very_active: 1.725, "very active": 1.725, active: 1.725,
    athlete: 1.9, extra_active: 1.9
  };
  const tdee = Math.round(bmr * (activityMultipliers[activity] || 1.55));
  let dailyCal = tdee;
  const goalLower = goal.toLowerCase();
  if (goalLower.includes("lose") || goalLower.includes("cut") || goalLower.includes("fat loss") || goalLower.includes("weight loss") || goalLower.includes("lean")) {
    dailyCal = Math.round(tdee - 500);
  } else if (goalLower.includes("build") || goalLower.includes("gain") || goalLower.includes("bulk") || goalLower.includes("muscle")) {
    dailyCal = Math.round(tdee + 300);
  }
  if (dailyCal < 1200) dailyCal = 1200;
  const proteinG = Math.round(weight * 1.8);
  const fatG = Math.round((dailyCal * 0.25) / 9);
  const carbsG = Math.round((dailyCal - proteinG * 4 - fatG * 9) / 4);

  return `Create a 7-day ${cuisines} fitness plan. User: ${profile.gender || "Male"}, ${profile.age || 25}yo, ${weight}kg→${targetWeight}kg, goal=${goal}, diet=${diet}, activity=${activity}.
Target: ${dailyCal}kcal/day (P:${proteinG}g C:${carbsG}g F:${fatG}g), water=${waterTarget}ml.
Equipment: ${equipment}. Allergies: ${allergies}. Dislikes: ${dislikes}. Budget: ${budget}. Cook time: ${cookTime}min.

Return JSON with this structure:
{"meta":{"plan_name":"string","duration_days":7,"daily_calories_target":${dailyCal},"macros":{"protein_g":${proteinG},"carbs_g":${carbsG},"fat_g":${fatG}},"water_target_ml":${waterTarget},"weight_current_kg":${weight},"weight_target_kg":${targetWeight},"goal":"${goal}","timeline_days":${timelineDays}},"timeline":[{"day":1,"meals":[{"title":"Dish Name","type":"breakfast","calories":400,"protein_g":25,"carbs_g":45,"fat_g":12,"ingredients":["item 1","item 2"],"instructions":"Brief steps"}],"workout":{"title":"Workout Name","duration_min":45,"calories_burn_est":300,"steps":[{"name":"Exercise","detail":"3x12 reps"}]},"water_schedule":[{"time":"07:00","amount_ml":500}]}],"grocery_list":[{"category":"Proteins","items":["chicken 1kg"]}],"milestones":[{"week":1,"target_kg":${weight},"focus":"Build habits"}]}

Rules: 7 days, 4 meals/day (breakfast,lunch,snack,dinner), real ${cuisines} dishes, ${diet} diet strictly, 5-6 exercises/workout, 1-2 rest days, avoid ${allergies}.`;
}


export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  registerObjectStorageRoutes(app, isAuthenticated);

  // Recover orphaned "generating" plans on startup (killed by server restart)
  (async () => {
    try {
      const orphaned = await storage.getOrphanedGeneratingPlans();
      if (orphaned.length > 0) {
        console.log(`[startup] Found ${orphaned.length} orphaned generating plan(s), marking as failed`);
        for (const p of orphaned) {
          await storage.updateGeneratedPlan(p.id, {
            status: "failed",
            failureReason: "Server restarted during generation. Please retry.",
            generationStage: "Failed",
            generationProgress: 0,
          });
        }
      }
    } catch (e) {
      console.error("[startup] Failed to recover orphaned plans:", e);
    }
  })();

  // Seed admin user
  (async () => {
    try {
      const existing = await storage.getUserByUsername("pratik");
      if (!existing) {
        const hashedPassword = await bcrypt.hash("pratik", 10);
        await storage.createUser({
          username: "pratik",
          password: hashedPassword,
          name: "Pratik (Admin)",
          role: "admin",
          onboardingComplete: true,
        });
        console.log("[seed] Admin user 'pratik' created");
      }
    } catch (e) {
      console.error("[seed] Failed to seed admin:", e);
    }
  })();

  // ─── Journey State ────────────────────────────────
  app.get("/api/journey/state", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.authUser;
      const role = user.role || "client";

      if (role === "admin") {
        return res.json({ role: "ADMIN", onboardingComplete: true, latestPlanStatus: "NONE", latestPlanId: null, nextRoute: "/admin" });
      }
      if (role === "coach") {
        return res.json({ role: "COACH", onboardingComplete: true, latestPlanStatus: "NONE", latestPlanId: null, nextRoute: "/coach-dashboard" });
      }

      const profile = await storage.getOnboardingProfile(user.id);
      const onboardingComplete = !!(profile && profile.completed);
      const latestPlan = await storage.getLatestPlan(user.id);

      let latestPlanStatus = "NONE";
      let latestPlanId: string | null = null;
      let nextRoute = "/onboarding";

      if (latestPlan) {
        latestPlanId = latestPlan.id;
        if (latestPlan.status === "ready") latestPlanStatus = "FINALIZED";
        else if (latestPlan.status === "generating") latestPlanStatus = "GENERATING";
        else if (latestPlan.status === "failed") latestPlanStatus = "FAILED";
        else latestPlanStatus = "DRAFT";
      }

      if (!onboardingComplete) {
        nextRoute = "/onboarding";
      } else if (latestPlanStatus === "NONE" || latestPlanStatus === "FAILED" || latestPlanStatus === "DRAFT") {
        nextRoute = "/dashboard/journey";
      } else if (latestPlanStatus === "GENERATING") {
        nextRoute = `/plan-creating/${latestPlanId}`;
      } else if (latestPlanStatus === "FINALIZED") {
        nextRoute = "/dashboard/today";
      }

      res.json({ role: "USER", onboardingComplete, latestPlanStatus, latestPlanId, nextRoute });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Health ────────────────────────────────
  app.get("/api/health", async (_req, res) => {
    let dbOk = false;
    try {
      await storage.getAllUsers();
      dbOk = true;
    } catch {}
    res.json({ buildVersion: "2.0.0", geminiConfigured: !!process.env.AI_INTEGRATIONS_GEMINI_API_KEY, dbOk });
  });

  // ─── Users ────────────────────────────────
  app.get("/api/users/:id", isAuthenticated, async (req: any, res) => {
    if (req.authUser.id !== req.params.id && req.authUser.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { password: _, ...safeUser } = user;
    // Compute BMI from latest weight log (server-side source of truth)
    let bmi: number | null = null;
    let latestWeightLog: { weightKg: number; date: string } | null = null;
    try {
      const logs = await storage.getWeightLogs(req.params.id, 365);
      const latest = logs[0];
      if (latest && user.height && user.height > 0) {
        const heightM = user.height / 100;
        bmi = Math.round((latest.weightKg / (heightM * heightM)) * 10) / 10;
        latestWeightLog = { weightKg: latest.weightKg, date: latest.date };
      }
    } catch {}
    res.json({ ...safeUser, bmi, latestWeightLog });
  });

  app.patch("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { password: _pw, ...bodyWithoutPassword } = req.body;
      const existingUser = await storage.getUser(req.params.id);
      if (!existingUser) return res.status(404).json({ message: "User not found" });
      const allowRoleChange = !existingUser.onboardingComplete && bodyWithoutPassword.onboardingComplete === true;
      if (!allowRoleChange) {
        delete bodyWithoutPassword.role;
      }
      if (bodyWithoutPassword.role === "admin") {
        delete bodyWithoutPassword.role;
      }
      const user = await storage.updateUser(req.params.id, bodyWithoutPassword);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ─── Register ──
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, name } = req.body;
      if (!username || !password) return res.status(400).json({ message: "Username and password are required" });
      if (username.length < 3) return res.status(400).json({ message: "Username must be at least 3 characters" });
      if (password.length < 4) return res.status(400).json({ message: "Password must be at least 4 characters" });

      const existing = await storage.getUserByUsername(username.trim().toLowerCase());
      if (existing) return res.status(409).json({ message: "Username already taken" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const { role: requestedRole } = req.body;
      const allowedRoles = ["client", "coach"];
      const finalRole = requestedRole && allowedRoles.includes(requestedRole) ? requestedRole : "client";
      const user = await storage.createUser({
        username: username.trim().toLowerCase(),
        password: hashedPassword,
        name: name?.trim() || username.trim(),
        role: finalRole,
      });
      const { password: _, ...safeUser } = user;
      const token = createAuthToken(user.id);
      res.status(201).json({ ...safeUser, token });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Login ──
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ message: "Username and password are required" });

      const user = await storage.getUserByUsername(username.trim().toLowerCase());
      if (!user) return res.status(401).json({ message: "Invalid username or password" });

      const validPassword = await bcrypt.compare(password, user.password || "");
      if (!validPassword) return res.status(401).json({ message: "Invalid username or password" });

      const { password: _, ...safeUser } = user;
      const token = createAuthToken(user.id);
      res.json({ ...safeUser, token });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Onboarding Profile ────────────────────────────
  app.post("/api/onboarding", async (req, res) => {
    try {
      const { userId, ...profileData } = req.body;
      if (!userId) return res.status(400).json({ message: "userId is required" });

      const existing = await storage.getOnboardingProfile(userId);
      if (existing) {
        const updated = await storage.updateOnboardingProfile(existing.id, { ...profileData, completed: true });
        return res.json(updated);
      }

      const profile = await storage.createOnboardingProfile({
        userId,
        ...profileData,
        completed: true,
      });
      res.status(201).json(profile);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/onboarding/:userId", async (req, res) => {
    try {
      const profile = await storage.getOnboardingProfile(req.params.userId);
      if (!profile) return res.status(404).json({ message: "No onboarding profile found" });
      res.json(profile);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── AI Plan Generation ────────────────────────────
  app.post("/api/plan/generate", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: "userId is required" });

      const profile = await storage.getOnboardingProfile(userId);
      if (!profile) return res.status(400).json({ message: "Complete onboarding first" });

      const plan = await storage.createGeneratedPlan({
        userId,
        onboardingProfileId: profile.id,
        status: "generating",
        modelName: "gemini-2.5-flash",
      });

      res.status(202).json({ planId: plan.id, status: "generating" });

      (async () => {
        try {
          const waterTarget = profile.waterTargetMl || Math.round((profile.weightKgCurrent || 70) * 35);

          await storage.updateGeneratedPlan(plan.id, { generationStage: "Analyzing goals", generationProgress: 10 });
          await new Promise(r => setTimeout(r, 400));
          await storage.updateGeneratedPlan(plan.id, { generationStage: "Calculating calories & macros", generationProgress: 25 });
          await new Promise(r => setTimeout(r, 400));
          await storage.updateGeneratedPlan(plan.id, { generationStage: "Designing meal plan", generationProgress: 40 });

          let planJson: any = null;

          // Try AI first; fall back to rule-based if unavailable
          try {
            console.log("[plan-gen] Trying Gemini AI for plan", plan.id);
            const prompt = buildPlanPrompt(profile, waterTarget);
            const aiPromise = ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: prompt,
              config: { temperature: 0.7, responseMimeType: "application/json" },
            });
            const result = await Promise.race([
              aiPromise,
              new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), 30000)),
            ]);
            let text = (result.text || "").trim()
              .replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/```\s*$/, "");
            const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
            if (parsed?.meta && Array.isArray(parsed?.timeline)) {
              planJson = parsed;
              console.log("[plan-gen] Gemini AI succeeded, plan length:", text.length);
            }
          } catch (aiErr: any) {
            console.log("[plan-gen] AI unavailable, using rule-based generator:", aiErr.message?.slice(0, 80));
          }

          // Rule-based fallback
          if (!planJson) {
            console.log("[plan-gen] Generating rule-based plan for", plan.id);
            await storage.updateGeneratedPlan(plan.id, { generationStage: "Building personalised plan", generationProgress: 50 });
            await new Promise(r => setTimeout(r, 300));
            planJson = generateRuleBasedPlan(profile, waterTarget);
          }

          await storage.updateGeneratedPlan(plan.id, { generationStage: "Creating workout structure", generationProgress: 65 });
          await new Promise(r => setTimeout(r, 300));
          await storage.updateGeneratedPlan(plan.id, { generationStage: "Generating milestones", generationProgress: 85 });
          await new Promise(r => setTimeout(r, 300));
          await storage.updateGeneratedPlan(plan.id, { generationStage: "Finalizing journey", generationProgress: 95 });
          await new Promise(r => setTimeout(r, 300));

          console.log("[plan-gen] Plan ready:", plan.id);
          await storage.updateGeneratedPlan(plan.id, {
            status: "ready",
            planJson,
            generationStage: "Complete",
            generationProgress: 100,
          });
        } catch (err: any) {
          console.error("[plan-gen] Failed:", err.message);
          await storage.updateGeneratedPlan(plan.id, {
            status: "failed",
            failureReason: sanitizeAiError(err),
            generationStage: "Failed",
            generationProgress: 0,
          });
        }
      })();
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/plan/latest/:userId", async (req, res) => {
    try {
      const plan = await storage.getLatestPlan(req.params.userId);
      if (!plan) return res.status(404).json({ message: "No plan found" });
      res.json(plan);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/plan/:planId", async (req, res) => {
    try {
      const plan = await storage.getGeneratedPlan(req.params.planId);
      if (!plan) return res.status(404).json({ message: "Plan not found" });
      res.json(plan);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Jung AI Coach ────────────────────────────
  app.get("/api/jung/session/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      let session = await storage.getActiveSession(userId);
      if (!session) {
        session = await storage.createConversationSession({ userId, status: "active" });
        const profile = await storage.getOnboardingProfile(userId);
        const greeting = profile 
          ? `Hey! I'm Jung, your AI fitness coach. I can see you've shared some details already — let's build on that. What's your main fitness goal right now?`
          : `Hey! I'm Jung, your AI fitness coach. I'm here to help you create a personalized fitness and nutrition plan. Let's start — what's your main goal? (e.g., lose weight, build muscle, improve endurance)`;
        
        await storage.createConversationMessage({
          sessionId: session.id,
          role: "jung",
          content: greeting,
          structuredData: { reply: greeting, questions: [], draft_summary: null, finalize_ready: false },
        });
      }
      const messages = await storage.getSessionMessages(session.id);
      res.json({ session, messages });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/jung/chat", async (req, res) => {
    try {
      const { userId, message, sessionId } = req.body;
      if (!userId || !message || !sessionId) {
        return res.status(400).json({ message: "userId, message, and sessionId are required" });
      }

      await storage.createConversationMessage({
        sessionId,
        role: "user",
        content: message,
      });

      const allMessages = await storage.getSessionMessages(sessionId);
      const profile = await storage.getOnboardingProfile(userId);

      const conversationHistory = allMessages.map(m => `${m.role === "user" ? "User" : "Jung"}: ${m.content}`).join("\n");
      
      const profileContext = profile ? `
USER PROFILE (from onboarding):
- Gender: ${profile.gender || "unknown"}, Age: ${profile.age || "unknown"}
- Height: ${profile.heightCm || "unknown"}cm, Current Weight: ${profile.weightKgCurrent || "unknown"}kg
- Target Weight: ${profile.weightKgTarget || "unknown"}kg
- Goal: ${profile.goalDescription || "not specified"}
- Timeline: ${profile.goalTimelineDays || "flexible"} days
- Activity Level: ${profile.activityLevel || "unknown"}
- Diet: ${profile.dietaryPreferences || "unknown"}
- Cuisines: ${(profile.cuisines || []).join(", ") || "any"}
- Allergies: ${(profile.allergies || []).join(", ") || "none"}
- Equipment: ${(profile.equipmentAvailable || []).join(", ") || "none specified"}
- Injuries: ${profile.injuriesLimitations || "none"}
- Budget: ${profile.budgetLevel || "moderate"}
- Cooking time: ${profile.cookingTimeAvailable || "30"} min
- Sleep: ${profile.sleepHoursAvg || "7"} hours
` : "No profile data available yet.";

      const userName = (await storage.getUser(userId))?.name || "there";

      const systemPrompt = `You are "Jung", a premium AI fitness and nutrition coach inside a fitness app.
Your job is to help ${userName} create a personalized fitness journey that is practical, specific, and safe.

PERSONALITY: Direct, friendly, highly specific. No generic advice. Short responses (2-3 sentences max per reply).

CORE RULES:
1) Address the user as "${userName}".
2) Ask ONE question at a time to fill gaps. Don't ask more than one question.
3) ALWAYS include every activity ${userName} mentions (boxing, swimming, running, etc.) — never drop activities.
4) After 2-3 exchanges with enough info, immediately produce a draft_summary with ALL activities listed.
5) Once you show a draft_summary, set finalize_ready to true in the SAME response. ${userName} can always ask to tweak before clicking Finalize.
6) AFTER the first draft_summary has been shown, ALWAYS include an updated draft_summary in EVERY subsequent response. The draft_summary must be CUMULATIVE — accumulate ALL preferences mentioned throughout the entire conversation.
7) When ${userName} tweaks something after seeing the draft, respond with an UPDATED draft_summary that incorporates the changes while keeping everything else.

SAFETY: If user indicates injury, pregnancy, eating disorder: advise professional guidance.

${profileContext}

FLOW:
1. Greet ${userName} → ask main goal (if not already known from profile)
2. Ask about activities/schedule (1 question)
3. Ask about food preferences (1 question)  
4. IMMEDIATELY produce draft_summary with finalize_ready=true

CRITICAL: When you have goal + activities + food info → produce draft_summary AND set finalize_ready=true. Do NOT wait for ${userName} to "confirm" the draft. They can refine it if needed.

DRAFT_SUMMARY RULES:
- DO NOT assume any nationality or cuisine preference. Use universally available foods unless the user explicitly states a cuisine preference.
- Include SPECIFIC named meals in sample_meals (not generic like "healthy breakfast"). Use actual food names like "Overnight Oats with Banana & Almonds", "Grilled Chicken Quinoa Bowl".
- Each food in sample_meals must be an object with: name, calories, protein_g, carbs_g, fat_g, sodium_mg
- The sample_meals MUST reflect ${userName}'s stated food preferences. If they said oats, eggs, protein bars — use those exact foods.
- Include a full 7-day workout_plan with day abbreviation, activity type, specific focus description, and duration.
- Include a daily_water_schedule string describing water distribution throughout the day.
- Include estimated_daily_burn based on the user's activities and body stats.
- Every time ${userName} mentions new foods or changes preferences, UPDATE the draft_summary with the new info accumulated.

You MUST respond with valid JSON only. No markdown.
{
  "reply": "your message",
  "questions": [],
  "draft_summary": null or {
    "goal": "Build muscle & stay lean",
    "timeline_days": 30,
    "training_days_per_week": 5,
    "calorie_target": 2200,
    "water_target_ml": 3000,
    "estimated_daily_burn": 2500,
    "sodium_limit_mg": 2300,
    "activities": ["boxing", "swimming", "running"],
    "meals_per_day": 4,
    "macros": { "protein_g": 150, "carbs_g": 250, "fat_g": 70 },
    "sample_meals": {
      "breakfast": [{ "name": "Overnight Oats with Banana & Almonds", "calories": 420, "protein_g": 15, "carbs_g": 55, "fat_g": 14, "sodium_mg": 85 }],
      "lunch": [{ "name": "Grilled Chicken Quinoa Bowl", "calories": 520, "protein_g": 38, "carbs_g": 45, "fat_g": 16, "sodium_mg": 340 }],
      "dinner": [{ "name": "Salmon with Sweet Potato & Greens", "calories": 580, "protein_g": 35, "carbs_g": 50, "fat_g": 22, "sodium_mg": 420 }],
      "snacks": [{ "name": "Protein Bar", "calories": 200, "protein_g": 20, "carbs_g": 22, "fat_g": 8, "sodium_mg": 150 }]
    },
    "workout_plan": [
      { "day": "Mon", "activity": "Boxing", "focus": "Heavy bag combos + footwork drills", "duration_min": 45 },
      { "day": "Tue", "activity": "Swimming", "focus": "Freestyle intervals 400m", "duration_min": 40 },
      { "day": "Wed", "activity": "Running", "focus": "Tempo run 5K", "duration_min": 30 },
      { "day": "Thu", "activity": "Boxing", "focus": "Shadow boxing + speed bag", "duration_min": 45 },
      { "day": "Fri", "activity": "Swimming", "focus": "Endurance swim 800m", "duration_min": 40 },
      { "day": "Sat", "activity": "Running", "focus": "Easy recovery jog", "duration_min": 25 },
      { "day": "Sun", "activity": "Rest", "focus": "Active recovery & stretching", "duration_min": 20 }
    ],
    "daily_water_schedule": "500ml morning, 500ml pre-workout, 1L during workout, 1L evening"
  },
  "finalize_ready": true or false
}

IMPORTANT: List ALL user-mentioned activities in the activities array. If user says "boxing, swimming, and running" → activities must be ["boxing", "swimming", "running"].
Set finalize_ready=true whenever draft_summary is not null.

CONVERSATION SO FAR:
${conversationHistory}`;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: systemPrompt + "\n\nUser's latest message: " + message,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      const text = result.text || "";
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = { reply: text.replace(/```json|```/g, "").trim(), questions: [], draft_summary: null, finalize_ready: false };
        }
      }

      await storage.createConversationMessage({
        sessionId,
        role: "jung",
        content: parsed.reply || text,
        structuredData: parsed,
      });

      if (parsed.draft_summary) {
        await storage.updateConversationSession(sessionId, {
          draftSummary: parsed.draft_summary,
          ...(parsed.finalize_ready ? { finalizeReady: true } : {}),
        });
      }

      res.json({
        reply: parsed.reply,
        questions: parsed.questions || [],
        draftSummary: parsed.draft_summary,
        finalizeReady: parsed.finalize_ready || false,
      });
    } catch (e: any) {
      console.error("[jung-chat] Error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/jung/quick-chat", isAuthenticated, async (req: any, res) => {
    try {
      const { message, conversationHistory } = req.body;
      const userId = req.authUser?.id;
      if (!userId || !message || typeof message !== "string" || message.length > 2000) {
        return res.status(400).json({ message: "Valid message is required (max 2000 chars)" });
      }

      const profile = await storage.getOnboardingProfile(userId);
      const user = await storage.getUser(userId);
      const userName = user?.name || "there";

      const today = new Date().toISOString().split("T")[0];
      let todayMeals: any[] = [];
      try {
        todayMeals = await storage.getMealLogs(userId, today);
      } catch { todayMeals = []; }

      let todayWater = 0;
      try {
        const waterLogs = await storage.getWaterLogs(userId);
        todayWater = (waterLogs || []).reduce((sum: number, w: any) => sum + (w.amount || 0), 0);
      } catch {}

      let todayWorkouts: any[] = [];
      try {
        todayWorkouts = await storage.getWorkoutLogs(userId);
      } catch { todayWorkouts = []; }

      let latestPlan: any = null;
      try {
        latestPlan = await storage.getLatestPlan(userId);
      } catch {}

      const totalCal = todayMeals.reduce((s: number, m: any) => s + (m.calories || 0), 0);
      const totalProtein = todayMeals.reduce((s: number, m: any) => s + (m.protein || 0), 0);
      const totalCarbs = todayMeals.reduce((s: number, m: any) => s + (m.carbs || 0), 0);
      const totalFat = todayMeals.reduce((s: number, m: any) => s + (m.fat || 0), 0);
      const totalCalBurned = todayWorkouts.reduce((s: number, w: any) => s + (w.caloriesBurned || 0), 0);

      const planMeta = latestPlan?.planJson?.meta || {};
      const calTarget = planMeta.daily_calories_target || user?.dailyCalorieTarget || 2000;
      const proteinTarget = planMeta.macros?.protein_g || 150;
      const carbsTarget = planMeta.macros?.carbs_g || 250;
      const fatTarget = planMeta.macros?.fat_g || 65;
      const waterTarget = planMeta.water_target_ml || 2500;

      const profileContext = profile ? `
USER PROFILE:
- Name: ${userName}, Gender: ${profile.gender || "unknown"}, Age: ${profile.age || "unknown"}
- Height: ${profile.heightCm || "unknown"}cm, Current Weight: ${profile.weightKgCurrent || "unknown"}kg
- Target Weight: ${profile.weightKgTarget || "unknown"}kg
- Goal: ${profile.goalDescription || "not specified"}
- Activity Level: ${profile.activityLevel || "unknown"}
- Diet: ${profile.dietaryPreferences || "unknown"}
- Cuisines: ${(profile.cuisines || []).join(", ") || "any"}
- Allergies: ${(profile.allergies || []).join(", ") || "none"}
- Injuries: ${profile.injuriesLimitations || "none"}
` : `User: ${userName}`;

      const todayContext = `
TODAY'S REAL-TIME DATA (${today}):
- Calories eaten: ${totalCal} / ${calTarget} kcal target (${Math.max(calTarget - totalCal, 0)} left)
- Protein: ${totalProtein}g / ${proteinTarget}g target
- Carbs: ${totalCarbs}g / ${carbsTarget}g target
- Fat: ${totalFat}g / ${fatTarget}g target
- Water: ${todayWater}ml / ${waterTarget}ml target
- Calories burned from exercise: ${totalCalBurned} kcal
- Net calorie balance: ${totalCal - totalCalBurned} kcal (eaten - burned)
- Calorie deficit needed for weight loss: eat less than ${calTarget} kcal
- Meals logged today: ${todayMeals.map((m: any) => `${m.name} (${m.calories}kcal, P:${m.protein}g C:${m.carbs}g F:${m.fat}g)`).join(", ") || "none yet"}
- Workouts today: ${todayWorkouts.map((w: any) => `${w.exerciseName} (${w.caloriesBurned || 0}kcal burned, ${w.duration || 0}min)`).join(", ") || "none yet"}
`;

      const planContext = latestPlan?.planJson ? `
CURRENT PLAN:
- Daily calories: ${calTarget} kcal
- Macros: P:${proteinTarget}g C:${carbsTarget}g F:${fatTarget}g
- Water: ${waterTarget}ml
- Plan has ${latestPlan.planJson.timeline?.length || 0} days
` : "No active plan.";

      const prevHistory = (conversationHistory || []).map((m: any) => `${m.role === "user" ? "User" : "Jung"}: ${m.content}`).join("\n");

      const systemPrompt = `You are "Jung", a premium AI fitness and nutrition coach inside the Sherpa Fit app.
You have FULL ACCESS to ${userName}'s profile, today's nutrition data, and their fitness plan.

PERSONALITY: Direct, warm, data-driven. Use actual numbers from their data. Give EXACT, SPECIFIC advice.
You have your own thoughts and opinions - share them proactively. Be like a real personal trainer who notices things.

${profileContext}
${todayContext}
${planContext}

CORE RULES:
1. Address user as "${userName}". Be personal and specific.
2. Reference REAL numbers: "You've eaten ${totalCal} of your ${calTarget} cal target" not generic advice.
3. For weight loss: Explain calorie deficit clearly. They need to eat LESS than ${calTarget} consistently.
4. Give exact food suggestions with calories when recommending meals.
5. If asked to change plan/targets, respond with action_type in your JSON.
6. Keep responses concise but packed with insight (2-4 sentences).
7. Be proactive: if you notice something (too much sodium, not enough protein, skipped water), mention it!
8. When the user asks "what should I eat", give SPECIFIC foods with exact calories and macros.

${prevHistory ? `CONVERSATION SO FAR:\n${prevHistory}\n` : ""}

RESPOND WITH VALID JSON ONLY:
{
  "reply": "your message to the user",
  "action_type": null or "update_calories" or "update_macros" or "update_water_target",
  "action_data": null or { relevant data for the action },
  "insight": null or "a short proactive observation about their data"
}`;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: systemPrompt + "\n\nUser's message: " + message,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      const text = result.text || "";
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          parsed = { reply: text.replace(/```json|```/g, "").trim(), action_type: null, action_data: null, insight: null };
        }
      }

      if (parsed.action_type === "update_calories" && parsed.action_data?.calories) {
        const newCal = Number(parsed.action_data.calories);
        if (newCal >= 800 && newCal <= 8000) {
          try {
            await storage.updateUser(userId, { dailyCalorieTarget: newCal });
          } catch {}
        }
      }

      res.json({
        reply: parsed.reply || text,
        action_type: parsed.action_type || null,
        action_data: parsed.action_data || null,
        insight: parsed.insight || null,
      });
    } catch (e: any) {
      console.error("[jung-quick-chat] Error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/jung/finalize", async (req, res) => {
    try {
      const { userId, sessionId } = req.body;
      if (!userId || !sessionId) return res.status(400).json({ message: "userId and sessionId required" });

      const session = await storage.getActiveSession(userId);
      if (!session) return res.status(404).json({ message: "No active session" });

      const profile = await storage.getOnboardingProfile(userId);
      const allMessages = await storage.getSessionMessages(sessionId);
      const conversationText = allMessages.map(m => `${m.role === "user" ? "User" : "Jung"}: ${m.content}`).join("\n");

      const plan = await storage.createGeneratedPlan({
        userId,
        onboardingProfileId: profile?.id,
        status: "generating",
        modelName: "gemini-2.5-flash",
        generationStage: "Analyzing goals",
        generationProgress: 0,
      });

      res.status(202).json({ planId: plan.id, status: "generating" });

      (async () => {
        try {
          const stages = [
            { stage: "Analyzing goals", progress: 10 },
            { stage: "Calculating calories & macros", progress: 25 },
            { stage: "Designing meal plan", progress: 40 },
            { stage: "Creating workout structure", progress: 55 },
            { stage: "Creating hydration schedule", progress: 70 },
            { stage: "Generating milestones", progress: 80 },
            { stage: "Creating analytics framework", progress: 90 },
            { stage: "Finalizing journey", progress: 95 },
          ];

          for (const s of stages.slice(0, 2)) {
            await storage.updateGeneratedPlan(plan.id, { generationStage: s.stage, generationProgress: s.progress });
            await new Promise(r => setTimeout(r, 800));
          }

          const draftSummary = session.draftSummary as any;
          const waterTarget = profile?.waterTargetMl || draftSummary?.water_target_ml || Math.round((profile?.weightKgCurrent || 70) * 35);
          const days = draftSummary?.timeline_days || profile?.goalTimelineDays || 14;
          const planDays = Math.min(days, 14);

          const profileContext = profile ? `
Gender: ${profile.gender}, Age: ${profile.age}
Height: ${profile.heightCm}cm, Weight: ${profile.weightKgCurrent}kg, Target: ${profile.weightKgTarget}kg
Goal: ${profile.goalDescription}
Activity: ${profile.activityLevel}
Diet: ${profile.dietaryPreferences}, Cuisines: ${(profile.cuisines || []).join(",")}
Allergies: ${(profile.allergies || []).join(",")}, Equipment: ${(profile.equipmentAvailable || []).join(",")}
Injuries: ${profile.injuriesLimitations || "none"}, Budget: ${profile.budgetLevel}
Cooking time: ${profile.cookingTimeAvailable}min, Sleep: ${profile.sleepHoursAvg}h` : "";

          await storage.updateGeneratedPlan(plan.id, { generationStage: "Designing meal plan", generationProgress: 40 });

          const activities = draftSummary?.activities || [];
          const cuisines = profile?.cuisines?.length ? profile.cuisines : [];
          
          const finalizePrompt = `You are Jung, an elite AI fitness & nutrition coach. Generate a HYPER-DETAILED personalized plan based on this conversation and profile.

CONVERSATION:
${conversationText}

USER PROFILE:
${profileContext}

DRAFT SUMMARY:
${JSON.stringify(draftSummary || {})}

DETECTED ACTIVITIES FROM CONVERSATION: ${activities.join(", ") || "general fitness"}

=== CRITICAL MEAL PLAN RULES ===
1. Every meal MUST have a SPECIFIC real dish name — NOT generic like "oats" or "chicken breast". Use actual recipe names:
   - GOOD: "Overnight Oats with Banana & Almonds", "Grilled Chicken Quinoa Bowl with Avocado", "Herb-Crusted Salmon with Roasted Vegetables"
   - BAD: "Oatmeal", "Chicken and rice", "Protein shake"
2. ${cuisines.length > 0 ? `Meals should match user's cuisine preference: ${cuisines.join(", ")}` : "Use universally available foods. Do NOT assume any specific cuisine or nationality unless the user explicitly stated a preference."}
3. Each meal needs 3-6 specific ingredients with exact amounts (e.g., "200g chicken thigh", "1 cup basmati rice", "2 tbsp ghee")
4. Include step-by-step cooking instructions (3-5 steps each)
5. Every meal needs realistic calorie and macro counts that ADD UP to the daily target
6. Include 1-2 alternatives per meal from the same cuisine

=== CRITICAL WORKOUT RULES ===
1. Workouts MUST include ALL activities mentioned: ${activities.join(", ") || "general fitness"}
2. Each workout day needs 4-8 specific exercises with sets, reps, and rest times
3. Vary the workout focus across days (e.g., Day 1: Boxing + Core, Day 2: Swimming + Strength, Day 3: Running + Flexibility)
4. Include warm-up and cool-down in workout steps
5. Exercises MUST be appropriate for the equipment available: ${profile?.equipmentAvailable?.join(", ") || "none specified"}

=== ACTIVITY TYPES ===
You MUST include these in activity_types_detected based on the conversation:
${activities.map(a => `- "${a}"`).join("\n") || "- detect from conversation"}

OUTPUT STRICT JSON. No markdown. No commentary.

{
  "meta": {
    "plan_name": "string (creative name like 'Pratik's Boxing Beast Mode' or 'Warrior Cut Program')",
    "start_date": "${new Date().toISOString().split('T')[0]}",
    "duration_days": ${planDays},
    "goal_summary": "string",
    "daily_calories_target": number,
    "macros": { "protein_g": number, "carbs_g": number, "fat_g": number },
    "water_target_ml": ${waterTarget},
    "meals_per_day": number,
    "disclaimer": "Consult a healthcare provider before starting any new fitness or nutrition program."
  },
  "modules_enabled": [
    { "key": "nutrition", "title": "Meals", "icon": "meal", "priority": 1 },
    { "key": "fitness", "title": "Workouts", "icon": "fitness", "priority": 2 },
    { "key": "hydration", "title": "Water", "icon": "water", "priority": 3 },
    { "key": "progress", "title": "Progress", "icon": "chart", "priority": 4 }
  ],
  "activity_types_detected": [
    { "type": "boxing", "tracking_mode": "structured", "metrics": ["duration_min", "rounds", "rpe"] },
    { "type": "swimming", "tracking_mode": "structured", "metrics": ["distance_m", "duration_min", "laps"] }
  ],
  "nutrition_plan": {
    "daily_meals": [
      {
        "type": "breakfast",
        "name": "Specific Dish Name",
        "calories": number,
        "macros": { "protein": number, "carbs": number, "fat": number, "sodium_mg": number },
        "ingredients": ["100g Ingredient A", "200ml Ingredient B"],
        "instructions": ["Step 1...", "Step 2..."],
        "alternatives": ["Alternative Dish 1", "Alternative Dish 2"]
      }
    ]
  },
  "fitness_plan": {
    "weekly_schedule": [
      {
        "day": "Mon",
        "activity_type": "boxing",
        "title": "Workout Title",
        "exercises": [
          { "name": "Exercise Name", "sets": number, "reps": "10-12 or 30s", "rest_seconds": 60, "instructions": "How to do it" }
        ]
      }
    ]
  },
  "hydration_plan": {
    "daily_target_ml": ${waterTarget},
    "schedule": [
      { "time": "08:00", "amount_ml": 500, "note": "Upon waking" }
    ]
  },
  "grocery_list": [
    { "item": "Ingredient name", "amount": "quantity", "category": "produce/meat/etc" }
  ]
}

ALSO include in the same JSON:
- "analytics_targets": { "daily": { "water_ml": ${waterTarget}, "steps": 8000, "sleep_hours": 8, "calories": number, "protein_g": number }, "weekly": { "training_sessions": number, "active_minutes": number } }
- "journey": { "milestones": [{ "title": "string", "target_day": number, "expected_weight_kg": number, "description": "string" }], "weekly_focus": [{ "week": number, "focus": "string", "notes": ["string"] }] }
- "days": array of ${planDays} day objects, each with: day number, label, goals, meals (with id, type, title as SPECIFIC NAMED DISH, kcal, macros, portion, ingredients with name+amount, prep_time_min, instructions array, alternatives array), workout (with id, title, duration_min, intensity, steps array with name+detail, rest_notes), hydration schedule, coach_notes
- "grocery_list": categorized (Proteins, Grains, Vegetables, Fruits, Dairy, Spices)
- "rules": { "substitutions": [...], "constraints": [...] }

CRITICAL REMINDERS:
- Generate EXACTLY ${planDays} days, each with COMPLETELY different meals and varied workouts
- Every single meal title must be a SPECIFIC NAMED DISH, not a generic description
- Workouts MUST rotate through ALL detected activities: ${activities.join(", ")}
- Day 1 might be Boxing + Core, Day 2: Swimming Endurance, Day 3: Running + Strength, etc.
- Each day's meals must add up close to the daily calorie target
- Include at least 4 milestones spread across the plan duration
- Generate a complete realistic grocery list for week 1`;

          await storage.updateGeneratedPlan(plan.id, { generationStage: "Creating workout structure", generationProgress: 55 });

          const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: finalizePrompt,
            config: { responseMimeType: "application/json", temperature: 0.5 },
          });

          await storage.updateGeneratedPlan(plan.id, { generationStage: "Creating hydration schedule", generationProgress: 70 });
          await new Promise(r => setTimeout(r, 500));

          const text = result.text || "";
          let planJson: any;
          try {
            planJson = JSON.parse(text);
          } catch {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) planJson = JSON.parse(jsonMatch[0]);
            else throw new Error("Failed to parse finalized plan JSON");
          }

          await storage.updateGeneratedPlan(plan.id, { generationStage: "Generating milestones", generationProgress: 80 });
          await new Promise(r => setTimeout(r, 500));

          if (!planJson.meta || !planJson.days || !Array.isArray(planJson.days)) {
            throw new Error("Plan JSON missing required sections (meta, days)");
          }

          const activityKeywords: Record<string, string[]> = {
            boxing: ["box", "boxing", "sparring", "heavy bag", "punch", "jab", "hook", "uppercut"],
            swimming: ["swim", "swimming", "pool", "laps", "freestyle", "butterfly"],
            running: ["run", "running", "jog", "5k", "10k", "marathon", "sprint"],
            cycling: ["cycle", "cycling", "bike", "spinning"],
            strength_training: ["bench", "squat", "deadlift", "dumbbells", "weights", "gym", "strength"],
            yoga: ["yoga", "vinyasa", "stretching"],
            walking: ["walk", "walking", "hike", "hiking"],
            bodyweight: ["push-up", "pull-up", "burpee", "bodyweight", "calisthenics"],
          };
          
          const convLower = conversationText.toLowerCase();
          const detectedFromConv: string[] = [];
          for (const [type, keywords] of Object.entries(activityKeywords)) {
            if (keywords.some(k => convLower.includes(k))) {
              detectedFromConv.push(type);
            }
          }

          const draftActivities = (draftSummary?.activities || []).map((a: string) => a.toLowerCase().replace(/\s+/g, "_"));
          const geminiDetected = (planJson.activity_types_detected || []).map((a: any) => a.type);
          const allDetected = [...new Set([...geminiDetected, ...detectedFromConv, ...draftActivities])];
          
          const metricsMap: Record<string, string[]> = {
            boxing: ["duration_min", "rounds", "rpe", "punches_thrown"],
            swimming: ["distance_m", "duration_min", "pace_per_100m", "laps", "rpe"],
            running: ["distance_km", "duration_min", "pace_per_km", "rpe"],
            cycling: ["distance_km", "duration_min", "avg_speed_kmh", "rpe"],
            strength_training: ["exercises", "sets", "reps", "load_kg", "rpe"],
            yoga: ["duration_min", "rpe"],
            walking: ["distance_km", "duration_min", "steps"],
            bodyweight: ["exercises", "sets", "reps", "rpe"],
          };

          planJson.activity_types_detected = allDetected.map(type => ({
            type,
            confidence: 0.95,
            tracking_mode: "structured",
            metrics: metricsMap[type] || ["duration_min", "rpe"],
          }));

          if (!planJson.modules_enabled) planJson.modules_enabled = [];
          const existingModuleKeys = planJson.modules_enabled.map((m: any) => m.key);
          const moduleMap: Record<string, { title: string; icon: string }> = {
            boxing: { title: "Boxing", icon: "gloves" },
            swimming: { title: "Swimming", icon: "swim" },
            running: { title: "Running", icon: "run" },
            cycling: { title: "Cycling", icon: "bike" },
            strength_training: { title: "Strength", icon: "dumbbell" },
            yoga: { title: "Yoga", icon: "yoga" },
          };
          
          for (const type of allDetected) {
            const moduleKey = `${type}_analytics`;
            if (!existingModuleKeys.includes(moduleKey) && moduleMap[type]) {
              planJson.modules_enabled.push({
                key: moduleKey,
                title: moduleMap[type].title,
                icon: moduleMap[type].icon,
                priority: planJson.modules_enabled.length + 1,
              });
            }
          }

          await storage.updateGeneratedPlan(plan.id, { generationStage: "Creating analytics framework", generationProgress: 90 });
          await new Promise(r => setTimeout(r, 500));

          const user = await storage.getUser(userId);
          if (user && planJson.meta) {
            await storage.updateUser(userId, {
              dailyCalorieTarget: planJson.meta.daily_calories_target,
              proteinTarget: planJson.meta.macros?.protein_g,
              carbsTarget: planJson.meta.macros?.carbs_g,
              fatTarget: planJson.meta.macros?.fat_g,
            });
          }

          await storage.updateGeneratedPlan(plan.id, {
            status: "ready",
            planJson,
            activityTypesDetected: planJson.activity_types_detected,
            modulesEnabled: planJson.modules_enabled,
            generationStage: "Complete",
            generationProgress: 100,
          });

          await storage.updateConversationSession(sessionId, { status: "closed" });

        } catch (err: any) {
          console.error("[jung-finalize] Failed:", err.message);
          await storage.updateGeneratedPlan(plan.id, {
            status: "failed",
            failureReason: sanitizeAiError(err),
            generationStage: "Failed",
            generationProgress: 0,
          });
        }
      })();
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/plan/:planId/status", async (req, res) => {
    try {
      const plan = await storage.getGeneratedPlan(req.params.planId);
      if (!plan) return res.status(404).json({ message: "Plan not found" });

      if (plan.status === "generating" && plan.createdAt) {
        const ageMs = Date.now() - new Date(plan.createdAt).getTime();
        if (ageMs > 180000) {
          await storage.updateGeneratedPlan(plan.id, {
            status: "failed",
            failureReason: "Generation timed out. Please try again.",
            generationStage: "Failed",
            generationProgress: 0,
          });
          return res.json({
            status: "failed",
            stage: "Failed",
            progress: 0,
            message: "Generation timed out. Please try again.",
          });
        }
      }

      res.json({
        status: plan.status,
        stage: plan.generationStage || null,
        progress: plan.generationProgress || 0,
        message: plan.status === "failed" ? plan.failureReason : null,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/activity/log", async (req, res) => {
    try {
      const { userId, activityType, durationMin, metadataJson, planId, planDay } = req.body;
      if (!userId || !activityType) return res.status(400).json({ message: "userId and activityType required" });
      const log = await storage.createActivityLog({ userId, activityType, durationMin, metadataJson, planId, planDay });
      res.status(201).json(log);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/activity/logs/:userId", async (req, res) => {
    try {
      const { activityType } = req.query;
      const logs = await storage.getActivityLogs(req.params.userId, activityType as string | undefined);
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Weekly Meal Presets ────────────────────────────
  app.get("/api/weekly-meals/:userId", async (req, res) => {
    try {
      const dayOfWeek = req.query.day !== undefined ? parseInt(req.query.day as string) : undefined;
      const presets = await storage.getWeeklyMealPresets(req.params.userId, dayOfWeek);
      res.json(presets);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/weekly-meals", async (req, res) => {
    try {
      const { userId, dayOfWeek, mealType, name, calories, protein, carbs, fat, fiber, sugar, sodium, ingredients } = req.body;
      if (!userId || dayOfWeek === undefined || !mealType || !name || !calories) {
        return res.status(400).json({ message: "userId, dayOfWeek, mealType, name, and calories are required" });
      }
      const preset = await storage.createWeeklyMealPreset({
        userId, dayOfWeek, mealType, name,
        calories: Math.round(calories),
        protein: protein || 0, carbs: carbs || 0, fat: fat || 0,
        fiber: fiber || 0, sugar: sugar || 0, sodium: sodium || 0,
        ingredients: ingredients || null,
      });
      res.status(201).json(preset);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/weekly-meals/:id", async (req, res) => {
    try {
      await storage.deleteWeeklyMealPreset(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/weekly-meals/copy-day", async (req, res) => {
    try {
      const { userId, fromDay, toDay } = req.body;
      if (!userId || fromDay === undefined || toDay === undefined) {
        return res.status(400).json({ message: "userId, fromDay, toDay required" });
      }
      const source = await storage.getWeeklyMealPresets(userId, fromDay);
      if (source.length === 0) return res.json({ copied: 0 });
      await storage.deleteAllWeeklyMealPresets(userId, toDay);
      const created = [];
      for (const p of source) {
        const meal = await storage.createWeeklyMealPreset({
          userId: p.userId, dayOfWeek: toDay, mealType: p.mealType,
          name: p.name, calories: p.calories,
          protein: p.protein || 0, carbs: p.carbs || 0, fat: p.fat || 0,
          fiber: p.fiber || 0, sugar: p.sugar || 0, sodium: p.sodium || 0,
          ingredients: p.ingredients || null,
        });
        created.push(meal);
      }
      res.json({ copied: created.length });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/weekly-meals/apply-today", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: "userId required" });
      const today = new Date().getDay();
      const presets = await storage.getWeeklyMealPresets(userId, today);
      const logged = [];
      for (const preset of presets) {
        const meal = await storage.createMealLog({
          userId: preset.userId,
          name: preset.name,
          calories: preset.calories,
          protein: preset.protein || 0,
          carbs: preset.carbs || 0,
          fat: preset.fat || 0,
          fiber: preset.fiber || 0,
          sugar: preset.sugar || 0,
          sodium: preset.sodium || 0,
          ingredients: preset.ingredients,
        });
        logged.push(meal);
      }
      res.json({ logged, count: logged.length });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Nutrition Insights ────────────────────────────
  app.get("/api/insights/:userId", async (req, res) => {
    try {
      const dismissed = req.query.dismissed === "true" ? true : req.query.dismissed === "false" ? false : undefined;
      const insights = await storage.getNutritionInsights(req.params.userId, dismissed);
      res.json(insights);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/insights/generate", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ message: "userId required" });

      const today = new Date().toISOString().split("T")[0];
      const meals = await storage.getMealLogs(userId, today);
      const profile = await storage.getOnboardingProfile(userId);
      const user = await storage.getUser(userId);

      const totalCalories = meals.reduce((s, m) => s + (m.calories || 0), 0);
      const totalCarbs = meals.reduce((s, m) => s + (m.carbs || 0), 0);
      const totalProtein = meals.reduce((s, m) => s + (m.protein || 0), 0);
      const totalFat = meals.reduce((s, m) => s + (m.fat || 0), 0);

      const targetCalories = profile?.dailyCalorieTarget || 2000;
      const insights: any[] = [];

      if (totalCalories > targetCalories * 1.1) {
        const overBy = Math.round(totalCalories - targetCalories);
        insights.push({
          userId, type: "over_calories", severity: "warning",
          message: `You're ${overBy} calories over your daily target.`,
          actionSuggestion: totalCalories > targetCalories * 1.3
            ? "Consider a 16-hour intermittent fast tonight to balance your intake. Skip late-night snacking and hydrate with water or herbal tea."
            : "Try a light evening walk (20-30 min) to burn some extra calories. Avoid heavy snacks for the rest of the day.",
          triggerData: { totalCalories, targetCalories, overBy },
        });
      }

      if (totalCalories > 0 && (totalCarbs / (totalCalories / 4)) > 0.6) {
        insights.push({
          userId, type: "high_carbs", severity: "info",
          message: `Your carb intake is high today (${Math.round(totalCarbs)}g). Consider balancing with protein.`,
          actionSuggestion: "Go for a 20-minute jog or brisk walk to utilize the extra carbs for energy. Add a protein-rich snack like eggs or Greek yogurt.",
          triggerData: { totalCarbs, carbPercent: Math.round((totalCarbs / (totalCalories / 4)) * 100) },
        });
      }

      if (totalProtein > 0 && totalProtein < (profile?.dailyCalorieTarget || 2000) * 0.003 * 0.8) {
        insights.push({
          userId, type: "low_protein", severity: "info",
          message: `Your protein intake is low today (${Math.round(totalProtein)}g). Aim for more lean protein sources.`,
          actionSuggestion: "Add a protein shake, grilled chicken, paneer, or dal to your next meal. Good protein fuels muscle recovery.",
          triggerData: { totalProtein },
        });
      }

      const waterLogs = await storage.getWaterLogs(userId, today);
      const todayWaterLogs = waterLogs.filter((l: any) => l.loggedAt && new Date(l.loggedAt).toISOString().split("T")[0] === today);
      const totalWater = todayWaterLogs.reduce((s, l) => s + (l.amount || 0), 0);
      const waterTarget = profile?.waterTargetMl || Math.round(((user?.weight || 70) * 35));

      if (totalWater < waterTarget * 0.5 && new Date().getHours() > 14) {
        insights.push({
          userId, type: "low_hydration", severity: "warning",
          message: `You've only had ${totalWater}ml of water. You're behind on hydration.`,
          actionSuggestion: `Drink ${Math.round((waterTarget - totalWater) / 250)} more glasses of water before bed. Set reminders every 30 minutes.`,
          triggerData: { totalWater, waterTarget },
        });
      }

      const now = new Date();
      if (meals.length === 0 && now.getHours() >= 12) {
        insights.push({
          userId, type: "no_meals_logged", severity: "info",
          message: "You haven't logged any meals yet today.",
          actionSuggestion: "Don't forget to track your meals! Logging helps you stay accountable and reach your goals faster.",
          triggerData: { hour: now.getHours() },
        });
      }

      const savedInsights = [];
      for (const insight of insights) {
        const existing = await storage.getNutritionInsights(userId, false);
        const alreadyExists = existing.some((e: any) => e.type === insight.type && new Date(e.createdAt!).toISOString().split("T")[0] === today);
        if (!alreadyExists) {
          const saved = await storage.createNutritionInsight(insight);
          savedInsights.push(saved);
        }
      }

      res.json({ insights: savedInsights, total: insights.length });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/insights/:id/dismiss", async (req, res) => {
    try {
      await storage.dismissNutritionInsight(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Progress Photos ────────────────────────────
  app.get("/api/progress-photos/:userId", isAuthenticated, async (req: any, res) => {
    try {
      if (req.authUser?.id !== req.params.userId) return res.status(403).json({ message: "Forbidden" });
      const photos = await storage.getProgressPhotos(req.params.userId);
      res.json(photos);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/progress-photos", isAuthenticated, async (req: any, res) => {
    try {
      const { userId, imageUrl, category, weight, bodyFatPercent, note, takenAt } = req.body;
      if (!userId || !imageUrl) return res.status(400).json({ message: "userId and imageUrl required" });
      if (req.authUser?.id !== userId) return res.status(403).json({ message: "Forbidden" });
      const validCategories = ["front", "side", "back"];
      const safeCategory = validCategories.includes(category) ? category : "front";
      const photo = await storage.createProgressPhoto({
        userId,
        imageUrl,
        category: safeCategory,
        weight: weight && !isNaN(parseFloat(weight)) ? parseFloat(weight) : null,
        bodyFatPercent: bodyFatPercent && !isNaN(parseFloat(bodyFatPercent)) ? parseFloat(bodyFatPercent) : null,
        note: note || null,
        takenAt: takenAt ? new Date(takenAt) : new Date(),
      });
      res.status(201).json(photo);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/progress-photos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const photos = await storage.getProgressPhotos(req.authUser?.id);
      const ownsPhoto = photos.some((p: any) => p.id === req.params.id);
      if (!ownsPhoto) return res.status(403).json({ message: "Forbidden" });
      await storage.deleteProgressPhoto(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Meal Reminders ────────────────────────────
  app.get("/api/meal-reminders/:userId", isAuthenticated, async (req: any, res) => {
    try {
      if (req.authUser?.id !== req.params.userId) return res.status(403).json({ message: "Forbidden" });
      const reminders = await storage.getMealReminders(req.params.userId);
      res.json(reminders);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/meal-reminders", isAuthenticated, async (req: any, res) => {
    try {
      const { mealType, scheduledTime, enabled, label } = req.body;
      if (!mealType || !scheduledTime) return res.status(400).json({ message: "mealType and scheduledTime required" });
      const reminder = await storage.upsertMealReminder({
        userId: req.authUser.id, mealType, scheduledTime,
        enabled: enabled !== undefined ? enabled : true,
        label: label || null,
      });
      res.json(reminder);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete("/api/meal-reminders/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteMealReminder(req.params.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ─── Water Logging (enhanced) ────────────────────────────
  app.post("/api/water/log", async (req, res) => {
    try {
      const { userId, amount } = req.body;
      if (!userId || !amount) return res.status(400).json({ message: "userId and amount required" });
      if (amount < 1 || amount > 5000) return res.status(400).json({ message: "Amount must be between 1 and 5000 ml" });
      const log = await storage.createWaterLog({ userId, amount: Math.round(amount) });
      res.status(201).json(log);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/water/today/:userId", async (req, res) => {
    try {
      const logs = await storage.getWaterLogs(req.params.userId);
      const dateParam = req.query.date as string | undefined;
      const filterDate = dateParam || new Date().toISOString().split("T")[0];
      const dateLogs = logs.filter((l: any) => l.loggedAt && new Date(l.loggedAt).toISOString().split("T")[0] === filterDate);
      const total = dateLogs.reduce((sum: number, l: any) => sum + l.amount, 0);
      const profile = await storage.getOnboardingProfile(req.params.userId);
      const user = await storage.getUser(req.params.userId);
      const target = profile?.waterTargetMl || Math.round(((user?.weight || 70) * 35));
      res.json({ total, target, logs: dateLogs });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Meal Logs ────────────────────────────
  app.get("/api/meals/:userId", async (req, res) => {
    const date = req.query.date as string | undefined;
    const meals = await storage.getMealLogs(req.params.userId, date);
    res.json(meals);
  });

  app.post("/api/meals", async (req, res) => {
    try {
      const body = { ...req.body };
      if (typeof body.calories === 'number') body.calories = Math.round(body.calories);
      const parsed = insertMealLogSchema.parse(body);
      const meal = await storage.createMealLog(parsed);
      res.status(201).json(meal);
    } catch (e: any) {
      console.error("[meals] Create meal failed:", e.message?.slice(0, 200));
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/meals/:id/recalculate", isAuthenticated, async (req: any, res) => {
    try {
      const { ingredients } = req.body;
      if (!ingredients || typeof ingredients !== "string" || ingredients.length > 3000) {
        return res.status(400).json({ message: "Valid ingredients string required (max 3000 chars)" });
      }
      const userId = req.authUser?.id;

      const systemPrompt = `You are a nutrition expert. The user has edited the ingredients of a food item. Based on the updated ingredients list, recalculate the macros as accurately as possible.

IMPORTANT: Use real nutritional data. Be precise with quantities mentioned. If quantities aren't specified, assume a normal single serving.

Respond ONLY with valid JSON:
{"name":"updated food name","calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"sugar":number,"sodium":number}`;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: systemPrompt + "\n\nRecalculate nutrition for these ingredients: " + ingredients,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      let text = result.text || "";
      text = text.replace(/```json|```/g, "").trim();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          return res.status(500).json({ message: "AI returned invalid response. Please try again." });
        }
      }

      if (typeof parsed.calories !== "number" || parsed.calories < 0) {
        return res.status(500).json({ message: "AI returned invalid nutrition data. Please try again." });
      }

      const updateData: any = {
        ingredients,
        calories: Math.round(parsed.calories || 0),
        protein: Math.round(parsed.protein || 0),
        carbs: Math.round(parsed.carbs || 0),
        fat: Math.round(parsed.fat || 0),
        fiber: Math.round(parsed.fiber || 0),
        sugar: Math.round(parsed.sugar || 0),
        sodium: Math.round(parsed.sodium || 0),
      };
      if (parsed.name && typeof parsed.name === "string") updateData.name = parsed.name;

      const updated = await storage.updateMealLog(req.params.id, updateData);
      res.json(updated);
    } catch (e: any) {
      console.error("Recalculate error:", e);
      res.status(500).json({ message: "Failed to recalculate macros. Please try again." });
    }
  });

  app.delete("/api/meals/:id", async (req, res) => {
    await storage.deleteMealLog(req.params.id);
    res.status(204).end();
  });

  app.get("/api/meals/:userId/weekly", async (req, res) => {
    try {
      const history = await storage.getWeeklyMealHistory(req.params.userId);
      res.json(history);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/meals/:userId/history", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) return res.status(400).json({ message: "startDate and endDate required" });
      const meals = await storage.getMealHistory(req.params.userId, startDate as string, endDate as string);
      res.json(meals);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Water Logs ───────────────────────────
  app.get("/api/water/:userId", async (req, res) => {
    const logs = await storage.getWaterLogs(req.params.userId);
    res.json(logs);
  });

  app.post("/api/water", async (req, res) => {
    try {
      const parsed = insertWaterLogSchema.parse(req.body);
      const log = await storage.createWaterLog(parsed);
      res.status(201).json(log);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/water/remove", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.authUser?.id;
      const rawAmount = Number(req.body?.amount);
      if (!rawAmount || rawAmount <= 0 || isNaN(rawAmount)) {
        return res.status(400).json({ message: "Valid positive amount required" });
      }
      const removeAmount = Math.min(rawAmount, 10000);
      const logs = await storage.getWaterLogs(userId);
      const totalLogged = logs.reduce((sum: number, l: any) => sum + l.amount, 0);
      if (totalLogged <= 0) return res.json({ message: "No water to remove", total: 0 });
      let remaining = Math.min(removeAmount, totalLogged);
      const reversedLogs = [...logs].reverse();
      for (const log of reversedLogs) {
        if (remaining <= 0) break;
        if (log.amount <= remaining) {
          remaining -= log.amount;
          await storage.deleteWaterLog(log.id);
        } else {
          await storage.deleteWaterLog(log.id, remaining);
          remaining = 0;
        }
      }
      res.json({ message: "Water removed", removed: removeAmount - remaining });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Workout of the Day (WOD) ────────────────────────────
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const WOD_DATA = [
    {
      dayIndex: 0,
      title: "Full Body Blast",
      description: "A complete full-body workout to kick off the week. Combines compound movements with bodyweight exercises for total conditioning.",
      difficulty: "Intermediate",
      durationMinutes: 35,
      estimatedCalories: 320,
      focusMuscles: ["Chest", "Legs", "Core", "Shoulders"],
      exercises: [
        { name: "Push-ups", sets: 3, reps: "15", restSeconds: 45, primaryMuscles: ["Chest", "Triceps", "Shoulders"], videoUrl: "/videos/pushups.mp4", instructions: "Start in a high plank position with hands shoulder-width apart. Lower your chest to the ground, keeping elbows at 45 degrees, then push back up explosively." },
        { name: "Squats", sets: 4, reps: "20", restSeconds: 60, primaryMuscles: ["Quadriceps", "Glutes", "Hamstrings"], videoUrl: "/videos/squats.mp4", instructions: "Stand with feet shoulder-width apart. Lower your hips back and down as if sitting in a chair until thighs are parallel to the floor. Drive through your heels to stand." },
        { name: "Plank", sets: 3, reps: "45 sec", restSeconds: 30, primaryMuscles: ["Core", "Shoulders", "Back"], videoUrl: "/videos/plank.mp4", instructions: "Hold a forearm plank position with your body in a straight line from head to heels. Engage your core and avoid letting your hips sag or pike." },
        { name: "Jumping Jacks", sets: 3, reps: "30", restSeconds: 30, primaryMuscles: ["Full Body", "Calves", "Shoulders"], videoUrl: null, instructions: "Stand with feet together and arms at your sides. Jump while spreading your legs and raising your arms overhead, then jump back to the starting position." },
        { name: "Burpees", sets: 3, reps: "10", restSeconds: 60, primaryMuscles: ["Full Body", "Chest", "Legs"], videoUrl: "/videos/burpees.mp4", instructions: "From standing, drop into a squat, kick your feet back into a plank, perform a push-up, jump feet forward, and explode upward with arms overhead." },
        { name: "High Knees", sets: 3, reps: "20 each leg", restSeconds: 30, primaryMuscles: ["Hip Flexors", "Core", "Quadriceps"], videoUrl: null, instructions: "Run in place while driving your knees up to hip height. Pump your arms and maintain a quick pace to keep your heart rate elevated." },
      ],
    },
    {
      dayIndex: 1,
      title: "Upper Body Power",
      description: "Build upper body strength and endurance with this push-pull focused workout. Great for building chest, shoulders, and arm definition.",
      difficulty: "Intermediate",
      durationMinutes: 30,
      estimatedCalories: 280,
      focusMuscles: ["Chest", "Shoulders", "Triceps", "Core"],
      exercises: [
        { name: "Push-ups", sets: 4, reps: "12", restSeconds: 45, primaryMuscles: ["Chest", "Triceps", "Shoulders"], videoUrl: "/videos/pushups.mp4", instructions: "Perform controlled push-ups with a 2-second descent and explosive push. Keep your core tight and body in a straight line throughout." },
        { name: "Diamond Push-ups", sets: 3, reps: "10", restSeconds: 60, primaryMuscles: ["Triceps", "Chest", "Shoulders"], videoUrl: null, instructions: "Place your hands close together under your chest, forming a diamond shape with your index fingers and thumbs. Lower and press back up focusing on triceps." },
        { name: "Plank", sets: 3, reps: "60 sec", restSeconds: 30, primaryMuscles: ["Core", "Shoulders", "Back"], videoUrl: "/videos/plank.mp4", instructions: "Hold a forearm plank with maximum tension. Squeeze your glutes, brace your abs, and breathe steadily throughout the hold." },
        { name: "Arm Circles", sets: 3, reps: "20 each direction", restSeconds: 20, primaryMuscles: ["Shoulders", "Rotator Cuff"], videoUrl: null, instructions: "Extend arms straight out to the sides. Make small circles forward for the prescribed reps, then reverse direction. Gradually increase circle size." },
        { name: "Mountain Climbers", sets: 3, reps: "20 each leg", restSeconds: 45, primaryMuscles: ["Core", "Hip Flexors", "Shoulders"], videoUrl: "/videos/mountain-climbers.mp4", instructions: "Start in a high plank position. Rapidly alternate driving each knee toward your chest while keeping your hips level and core engaged." },
        { name: "Plank Shoulder Taps", sets: 3, reps: "12 each side", restSeconds: 30, primaryMuscles: ["Core", "Shoulders", "Obliques"], videoUrl: null, instructions: "In a high plank position, lift one hand to tap the opposite shoulder. Alternate sides while minimizing hip rotation and keeping your core stable." },
      ],
    },
    {
      dayIndex: 2,
      title: "Leg Day Inferno",
      description: "An intense lower body session targeting quads, glutes, and hamstrings. Build powerful legs and improve lower body endurance.",
      difficulty: "Advanced",
      durationMinutes: 40,
      estimatedCalories: 380,
      focusMuscles: ["Quadriceps", "Glutes", "Hamstrings", "Calves"],
      exercises: [
        { name: "Squats", sets: 4, reps: "20", restSeconds: 60, primaryMuscles: ["Quadriceps", "Glutes", "Hamstrings"], videoUrl: "/videos/squats.mp4", instructions: "Perform deep squats with controlled tempo. Go as low as your mobility allows while keeping your chest up and knees tracking over toes." },
        { name: "Lunges", sets: 4, reps: "12 each leg", restSeconds: 60, primaryMuscles: ["Quadriceps", "Glutes", "Hamstrings"], videoUrl: "/videos/lunges.mp4", instructions: "Step forward into a lunge, lowering your back knee toward the floor. Push through your front heel to return to standing. Alternate legs each rep." },
        { name: "Jump Squats", sets: 3, reps: "15", restSeconds: 60, primaryMuscles: ["Quadriceps", "Glutes", "Calves"], videoUrl: null, instructions: "Perform a bodyweight squat, then explode upward into a jump at the top. Land softly with bent knees and immediately go into the next rep." },
        { name: "Wall Sit", sets: 3, reps: "45 sec", restSeconds: 45, primaryMuscles: ["Quadriceps", "Glutes"], videoUrl: null, instructions: "Lean your back flat against a wall and slide down until your thighs are parallel to the floor. Hold this position with your weight in your heels." },
        { name: "Burpees", sets: 3, reps: "10", restSeconds: 60, primaryMuscles: ["Full Body", "Legs", "Core"], videoUrl: "/videos/burpees.mp4", instructions: "Combine a squat thrust with a jump for maximum leg engagement. Focus on explosive hip extension on each jump." },
        { name: "Calf Raises", sets: 4, reps: "25", restSeconds: 30, primaryMuscles: ["Calves", "Ankles"], videoUrl: null, instructions: "Stand on the edge of a step or flat ground. Rise up onto your toes as high as possible, pause at the top, then lower slowly below the starting position." },
      ],
    },
    {
      dayIndex: 3,
      title: "Core Crusher",
      description: "A dedicated core workout to build abdominal strength, stability, and endurance. Targets all areas of the core for balanced development.",
      difficulty: "Intermediate",
      durationMinutes: 25,
      estimatedCalories: 220,
      focusMuscles: ["Core", "Obliques", "Lower Back", "Hip Flexors"],
      exercises: [
        { name: "Plank", sets: 3, reps: "60 sec", restSeconds: 30, primaryMuscles: ["Core", "Shoulders", "Back"], videoUrl: "/videos/plank.mp4", instructions: "Hold a rock-solid forearm plank. Focus on pulling your belly button toward your spine and maintaining a perfectly straight line from head to heels." },
        { name: "Mountain Climbers", sets: 4, reps: "20 each leg", restSeconds: 40, primaryMuscles: ["Core", "Hip Flexors", "Shoulders"], videoUrl: "/videos/mountain-climbers.mp4", instructions: "In a high plank, drive your knees to your chest in rapid succession. Keep your back flat and core braced throughout the movement." },
        { name: "Bicycle Crunches", sets: 3, reps: "20 each side", restSeconds: 30, primaryMuscles: ["Obliques", "Rectus Abdominis"], videoUrl: null, instructions: "Lie on your back with hands behind your head. Bring your right elbow to your left knee while extending the right leg, then alternate sides in a pedaling motion." },
        { name: "Dead Bug", sets: 3, reps: "12 each side", restSeconds: 30, primaryMuscles: ["Core", "Hip Flexors", "Lower Back"], videoUrl: null, instructions: "Lie on your back with arms extended toward the ceiling and knees bent at 90 degrees. Slowly lower opposite arm and leg toward the floor while keeping your back pressed into the ground." },
        { name: "Flutter Kicks", sets: 3, reps: "30 sec", restSeconds: 30, primaryMuscles: ["Lower Abs", "Hip Flexors"], videoUrl: null, instructions: "Lie on your back with legs extended. Lift your feet 6 inches off the ground and alternate kicking up and down in small, controlled movements." },
        { name: "Push-ups", sets: 3, reps: "12", restSeconds: 45, primaryMuscles: ["Chest", "Core", "Triceps"], videoUrl: "/videos/pushups.mp4", instructions: "Perform push-ups with extra focus on core engagement. Squeeze your abs throughout and avoid any sagging in your midsection." },
      ],
    },
    {
      dayIndex: 4,
      title: "HIIT Cardio Burn",
      description: "A high-intensity interval training session designed to maximize calorie burn and cardiovascular fitness. Fast-paced and challenging.",
      difficulty: "Advanced",
      durationMinutes: 30,
      estimatedCalories: 400,
      focusMuscles: ["Full Body", "Core", "Legs", "Cardiovascular"],
      exercises: [
        { name: "Burpees", sets: 4, reps: "12", restSeconds: 45, primaryMuscles: ["Full Body", "Chest", "Legs"], videoUrl: "/videos/burpees.mp4", instructions: "Perform burpees at maximum intensity. Drop fast, push up explosively, and jump as high as you can on each rep." },
        { name: "Mountain Climbers", sets: 4, reps: "30 each leg", restSeconds: 30, primaryMuscles: ["Core", "Hip Flexors", "Shoulders"], videoUrl: "/videos/mountain-climbers.mp4", instructions: "Sprint-style mountain climbers at top speed. Drive your knees as fast as possible while maintaining plank form." },
        { name: "High Knees", sets: 4, reps: "30 each leg", restSeconds: 30, primaryMuscles: ["Hip Flexors", "Core", "Quadriceps"], videoUrl: null, instructions: "Drive your knees to hip height as fast as possible while pumping your arms. Stay on the balls of your feet for maximum speed." },
        { name: "Squats", sets: 3, reps: "20", restSeconds: 45, primaryMuscles: ["Quadriceps", "Glutes", "Hamstrings"], videoUrl: "/videos/squats.mp4", instructions: "Perform rapid bodyweight squats with full range of motion. Maintain good form even as fatigue sets in." },
        { name: "Skater Jumps", sets: 3, reps: "15 each side", restSeconds: 30, primaryMuscles: ["Glutes", "Quadriceps", "Calves"], videoUrl: null, instructions: "Jump laterally from one foot to the other, landing softly on a single leg. Swing your arms for momentum and balance." },
        { name: "Plank", sets: 2, reps: "45 sec", restSeconds: 30, primaryMuscles: ["Core", "Shoulders", "Back"], videoUrl: "/videos/plank.mp4", instructions: "Hold a forearm plank to finish the session. Focus on deep breathing while maintaining maximum core tension." },
      ],
    },
    {
      dayIndex: 5,
      title: "Strength & Stability",
      description: "Build functional strength and improve stability with controlled movements. Perfect for developing balance and muscular control.",
      difficulty: "Intermediate",
      durationMinutes: 35,
      estimatedCalories: 300,
      focusMuscles: ["Legs", "Core", "Shoulders", "Glutes"],
      exercises: [
        { name: "Lunges", sets: 4, reps: "12 each leg", restSeconds: 60, primaryMuscles: ["Quadriceps", "Glutes", "Hamstrings"], videoUrl: "/videos/lunges.mp4", instructions: "Perform slow, controlled lunges with a 3-second descent. Focus on balance and keeping your torso upright throughout the movement." },
        { name: "Push-ups", sets: 3, reps: "15", restSeconds: 45, primaryMuscles: ["Chest", "Triceps", "Shoulders"], videoUrl: "/videos/pushups.mp4", instructions: "Slow tempo push-ups with a 3-second lowering phase and 1-second pause at the bottom. Focus on perfect form and muscle control." },
        { name: "Single Leg Deadlift", sets: 3, reps: "10 each leg", restSeconds: 45, primaryMuscles: ["Hamstrings", "Glutes", "Lower Back"], videoUrl: null, instructions: "Stand on one leg and hinge at the hips, extending your other leg behind you for balance. Lower until your torso is parallel to the floor, then return to standing." },
        { name: "Plank", sets: 3, reps: "50 sec", restSeconds: 30, primaryMuscles: ["Core", "Shoulders", "Back"], videoUrl: "/videos/plank.mp4", instructions: "Focus on perfect alignment in your plank hold. Actively push the ground away and engage every muscle from shoulders to ankles." },
        { name: "Glute Bridges", sets: 3, reps: "20", restSeconds: 30, primaryMuscles: ["Glutes", "Hamstrings", "Core"], videoUrl: null, instructions: "Lie on your back with knees bent. Drive through your heels to lift your hips until your body forms a straight line from knees to shoulders. Squeeze glutes at the top." },
        { name: "Squats", sets: 3, reps: "15", restSeconds: 45, primaryMuscles: ["Quadriceps", "Glutes", "Hamstrings"], videoUrl: "/videos/squats.mp4", instructions: "Perform controlled squats with a pause at the bottom position. Hold for 2 seconds at parallel before driving back up." },
      ],
    },
    {
      dayIndex: 6,
      title: "Active Recovery Flow",
      description: "A lighter workout focused on mobility, flexibility, and active recovery. Helps reduce soreness and prepare the body for the next training week.",
      difficulty: "Beginner",
      durationMinutes: 25,
      estimatedCalories: 150,
      focusMuscles: ["Full Body", "Core", "Hip Flexors", "Back"],
      exercises: [
        { name: "Plank", sets: 2, reps: "30 sec", restSeconds: 30, primaryMuscles: ["Core", "Shoulders", "Back"], videoUrl: "/videos/plank.mp4", instructions: "Hold a gentle plank focusing on breathing. Inhale for 4 counts, exhale for 4 counts while maintaining the position." },
        { name: "Lunges", sets: 2, reps: "10 each leg", restSeconds: 45, primaryMuscles: ["Quadriceps", "Glutes", "Hip Flexors"], videoUrl: "/videos/lunges.mp4", instructions: "Perform slow walking lunges with an emphasis on stretching your hip flexors. Hold the bottom position for 2 seconds on each rep." },
        { name: "Cat-Cow Stretch", sets: 3, reps: "10", restSeconds: 20, primaryMuscles: ["Spine", "Core", "Back"], videoUrl: null, instructions: "On all fours, alternate between arching your back (cow) and rounding it (cat). Move slowly and coordinate with your breath." },
        { name: "Squats", sets: 2, reps: "12", restSeconds: 45, primaryMuscles: ["Quadriceps", "Glutes", "Hamstrings"], videoUrl: "/videos/squats.mp4", instructions: "Light bodyweight squats focusing on mobility. Sit as deep as possible and hold the bottom position for a moment on each rep." },
        { name: "Leg Swings", sets: 2, reps: "15 each leg", restSeconds: 20, primaryMuscles: ["Hip Flexors", "Hamstrings", "Glutes"], videoUrl: null, instructions: "Stand on one leg and swing the other leg forward and backward in a controlled arc. Gradually increase the range of motion with each swing." },
        { name: "Supine Spinal Twist", sets: 2, reps: "30 sec each side", restSeconds: 20, primaryMuscles: ["Spine", "Obliques", "Lower Back"], videoUrl: null, instructions: "Lie on your back with arms extended. Drop both knees to one side while keeping your shoulders flat on the ground. Hold and breathe deeply, then switch sides." },
      ],
    },
  ];

  app.get("/api/wod/today", (_req, res) => {
    const dayIndex = new Date().getDay();
    const wod = WOD_DATA[dayIndex];
    res.json({ ...wod, dayName: DAY_NAMES[dayIndex] });
  });

  app.get("/api/wod/:dayIndex", (req, res) => {
    const dayIndex = parseInt(req.params.dayIndex, 10);
    if (isNaN(dayIndex) || dayIndex < 0 || dayIndex > 6) {
      return res.status(400).json({ message: "dayIndex must be between 0 (Sunday) and 6 (Saturday)" });
    }
    const wod = WOD_DATA[dayIndex];
    res.json({ ...wod, dayName: DAY_NAMES[dayIndex] });
  });

  // ─── Exercises ────────────────────────────
  app.get("/api/exercises", async (req, res) => {
    const category = req.query.category as string | undefined;
    const exercises = await storage.getExercises(category);
    res.json(exercises);
  });

  app.get("/api/exercises/:id", async (req, res) => {
    const exercise = await storage.getExercise(req.params.id);
    if (!exercise) return res.status(404).json({ message: "Exercise not found" });
    res.json(exercise);
  });

  // ─── Workout Plans ────────────────────────
  app.get("/api/workout-plans", async (req, res) => {
    const category = req.query.category as string | undefined;
    const plans = await storage.getWorkoutPlans(category);
    res.json(plans);
  });

  app.get("/api/workout-plans/:id", async (req, res) => {
    const plan = await storage.getWorkoutPlan(req.params.id);
    if (!plan) return res.status(404).json({ message: "Workout plan not found" });
    res.json(plan);
  });

  // ─── Workout Logs ─────────────────────────
  app.get("/api/workout-logs/:userId", async (req, res) => {
    const logs = await storage.getWorkoutLogs(req.params.userId);
    res.json(logs);
  });

  app.post("/api/workout-logs", async (req, res) => {
    try {
      const parsed = insertWorkoutLogSchema.parse(req.body);
      const log = await storage.createWorkoutLog(parsed);
      res.status(201).json(log);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/workout-logs/:id", async (req, res) => {
    try {
      await storage.deleteWorkoutLog(req.params.id);
      res.status(204).end();
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/water/reset/:userId", async (req, res) => {
    try {
      const logs = await storage.getWaterLogs(req.params.userId);
      for (const log of logs) {
        await storage.deleteWaterLog(log.id);
      }
      res.status(204).end();
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Meal Plans ───────────────────────────
  app.get("/api/meal-plans", async (req, res) => {
    const cuisine = req.query.cuisine as string | undefined;
    const dietType = req.query.dietType as string | undefined;
    const plans = await storage.getMealPlans(cuisine, dietType);
    res.json(plans);
  });

  app.get("/api/meal-plans/:id", async (req, res) => {
    const plan = await storage.getMealPlan(req.params.id);
    if (!plan) return res.status(404).json({ message: "Meal plan not found" });
    res.json(plan);
  });

  app.post("/api/meal-plans/generate", async (req, res) => {
    try {
      const { userId, cuisinePreference, dietType, goal, calorieTarget, proteinTarget, carbsTarget, fatTarget } = req.body;
      if (!userId) return res.status(400).json({ message: "userId is required" });

      const user = await storage.getUser(userId);
      const cuisine = cuisinePreference || user?.cuisinePreference || "mixed";
      const diet = dietType || user?.dietType || "non-veg";
      const userGoal = goal || "maintain";
      const calories = calorieTarget || user?.dailyCalorieTarget || 2400;
      const protein = proteinTarget || user?.proteinTarget || 160;
      const carbs = carbsTarget || user?.carbsTarget || 220;
      const fat = fatTarget || user?.fatTarget || 70;

      const cuisineFoods: Record<string, string> = {
        nepali: "dalbhat, dhido, gundruk, sel roti, momo, thukpa, chiura, choyla, aloo tama, kwati, yomari, chatamari",
        indian: "paneer, dal, roti, biryani, idli, dosa, sambar, chole, rajma, paratha, sabzi, raita",
        chinese: "tofu, ramen, stir fry, dim sum, congee, bok choy, steamed fish, mapo tofu, dumplings",
        mixed: "dalbhat, momo, paneer, dal, roti, tofu, stir fry, dumplings, muesli, chia seeds, oats, eggs, salad, yogurt, fruits",
      };

      const foodList = cuisineFoods[cuisine.toLowerCase()] || cuisineFoods.mixed;

      const goalInstruction = userGoal === "weight_loss" || userGoal === "lose"
        ? "The user wants to LOSE weight. Create a calorie DEFICIT plan. Use smaller portions, more vegetables, lean proteins, and lighter cooking methods (steaming, grilling). Reduce oil/ghee."
        : userGoal === "weight_gain" || userGoal === "gain" || userGoal === "muscle"
        ? "The user wants to GAIN weight/muscle. Create a calorie SURPLUS plan. Use larger portions, add healthy fats, extra protein sources, and calorie-dense traditional foods."
        : "The user wants to MAINTAIN weight. Create a balanced plan matching their exact calorie and macro targets.";

      const prompt = `You are an expert nutritionist who deeply respects cultural food traditions.

CRITICAL RULE: Use the same traditional diet the person already eats. Do NOT change their cultural food. Adjust portions and preparation methods to match their weight goal.

Generate a daily meal plan with 5-6 meals/snacks for a person who eats ${cuisine} cuisine.
Diet type: ${diet}
${goalInstruction}

Use these traditional foods: ${foodList}

Target macros for the ENTIRE day:
- Calories: ${calories} kcal
- Protein: ${protein}g
- Carbs: ${carbs}g
- Fat: ${fat}g

Return a JSON array of meals. Each meal must have:
- name: specific dish name
- mealType: one of "breakfast", "lunch", "dinner", "snack"
- calories: number
- protein: number (grams)
- carbs: number (grams)
- fat: number (grams)
- description: brief description of the dish and portion
- ingredients: array of ingredient strings

The sum of all meal calories should be close to ${calories}. The sum of protein should be close to ${protein}g, carbs close to ${carbs}g, fat close to ${fat}g.

Include at least: 1 breakfast, 1 lunch, 1 dinner, and 2 snacks.
Return ONLY a valid JSON array, no other text.`;

      let mealPlan: any = null;
      const models = ["gemini-2.5-flash", "gemini-2.5-pro"];

      for (const model of models) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              maxOutputTokens: 4096,
              responseMimeType: "application/json",
            },
          });

          const rawText = response.text || "";
          console.log(`[Meal Plan] ${model} raw response (${rawText.length} chars)`);

          const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
          let jsonMatch = cleaned.match(/\[[\s\S]*\]/);

          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
                mealPlan = parsed;
                console.log(`[Meal Plan] ${model} generated ${parsed.length} meals`);
                break;
              }
            } catch (parseErr) {
              console.log(`[Meal Plan] ${model} JSON parse failed, attempting recovery...`);
              try {
                const objectMatch = cleaned.match(/\{[\s\S]*?"name"[\s\S]*?\}/g);
                if (objectMatch && objectMatch.length > 0) {
                  const recovered = objectMatch.map(m => {
                    try { return JSON.parse(m); } catch { return null; }
                  }).filter(Boolean);
                  if (recovered.length > 0) {
                    mealPlan = recovered;
                    console.log(`[Meal Plan] ${model} recovered ${recovered.length} meals`);
                    break;
                  }
                }
              } catch {}
            }
          }
        } catch (modelErr: any) {
          console.log(`[Meal Plan] ${model} failed: ${modelErr?.message || modelErr}`);
        }
      }

      if (!mealPlan) {
        return res.status(500).json({ message: "Failed to generate meal plan. Please try again." });
      }

      res.json({
        cuisine,
        dietType: diet,
        goal: userGoal,
        targets: { calories, protein, carbs, fat },
        meals: mealPlan,
        totalCalories: mealPlan.reduce((sum: number, m: any) => sum + (m.calories || 0), 0),
        totalProtein: mealPlan.reduce((sum: number, m: any) => sum + (m.protein || 0), 0),
        totalCarbs: mealPlan.reduce((sum: number, m: any) => sum + (m.carbs || 0), 0),
        totalFat: mealPlan.reduce((sum: number, m: any) => sum + (m.fat || 0), 0),
      });
    } catch (e: any) {
      console.error("Meal plan generation error:", e?.message || e);
      res.status(500).json({ message: e.message || "Failed to generate meal plan" });
    }
  });

  // ─── AI Food Analysis ────────────────────────
  app.post("/api/analyze-food", async (req, res) => {
    try {
      const { image, scanType } = req.body;
      if (!image) return res.status(400).json({ message: "Image data required" });

      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const mimeType = image.match(/^data:(image\/\w+);base64,/)?.[1] || "image/jpeg";

      let prompt = "";

      if (scanType === "barcode") {
        prompt = `You are an expert barcode reader and product nutrition analyst. Analyze this image.

TASK: 
1. Read the barcode/QR code in this image. Identify the product.
2. If you can read the barcode number, use your knowledge to identify the product.
3. If the barcode is unclear, look for any product packaging, brand name, or text visible.
4. Provide COMPLETE nutritional information for the identified product.

ABSOLUTE RULE: NEVER return "no food detected" or zero values. Even if the barcode is unreadable, identify what the product LOOKS like from its packaging, color, shape, and size.

ALWAYS provide:
- The exact product name and brand if possible
- Complete macros: calories, protein, carbs, fat, fiber, sugar, sodium (never all zeros)
- A detailed comma-separated list of likely ingredients for this product
- Serving size information

Return ONLY valid JSON:
{"name":"product name (brand if known)","calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"sugar":number,"sodium":number,"serving":"serving size","confidence":number,"ingredients":"ingredient1, ingredient2, ingredient3, ...","brand":"brand name or empty","barcode":"barcode number if readable"}`;
      } else if (scanType === "label") {
        prompt = `You are an expert nutrition label reader. Analyze this food label/nutrition facts image carefully.

TASK:
1. Read ALL text on this nutrition label or food packaging.
2. Extract the exact nutritional values shown on the label.
3. Read the complete ingredients list from the label.
4. Identify the product name and brand.

CRITICAL:
- Read the EXACT values from the label, do not estimate.
- Extract the COMPLETE ingredients list as shown on the packaging.
- If per-serving and per-100g values are shown, use per-serving values.
- Include ALL micronutrients visible on the label.

Return ONLY valid JSON:
{"name":"product name","calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"sugar":number,"sodium":number,"serving":"serving size as shown","confidence":number,"ingredients":"full ingredients list from label","brand":"brand name","strictParse":true,"dataQuality":"label_extracted"}`;
      } else {
        prompt = `You are a precision nutrition estimation AI, similar to CalAI or MyFitnessPal. Your job is to estimate calories and macros as ACCURATELY as possible by breaking down each visible food component individually.

STEP 1 - IDENTIFY EVERY COMPONENT:
Look at the plate/bowl and identify EACH separate food item visible. For example, a Nepali dal bhat plate has: rice, dal (lentil soup), tarkari (vegetable curry), achar (pickle), greens, etc. List each one separately.

STEP 2 - ESTIMATE PORTIONS CONSERVATIVELY:
For each component, estimate the portion size in standard units (cups, tablespoons, pieces, grams). 
CRITICAL RULES for portion estimation:
- Home-cooked meals use LESS oil/ghee than restaurants. A typical home meal uses 1-2 tsp oil per dish, NOT tablespoons.
- Rice: A typical serving is 1 to 1.5 cups cooked (180-270 cal), NOT 2+ cups
- Dal/lentil soup: Usually 0.5-0.75 cup (100-150 cal)
- Vegetable curry: Usually 0.5-0.75 cup (80-150 cal depending on oil)
- Ghee/oil: Unless clearly visible as a pool, estimate 1-2 tsp (40-80 cal)
- Bread/roti: One piece is typically 100-120 cal
- DO NOT overestimate. When uncertain, use the LOWER end of the range.
- A full plate of home-cooked South Asian food is typically 400-600 cal, NOT 700-900 cal.

STEP 3 - SUM UP:
Add up the calories and macros from each component to get the total. The total should match what a food scale would show.

CUISINE RECOGNITION - You MUST recognize dishes from ALL cuisines:
* South Asian: Nepali (momo, laphing/laping, sel roti, dhido, gundruk, chatamari, dal bhat, thukpa, choyla), Indian (biryani, dosa, idli, paneer tikka, chole bhature, dal makhani, samosa), Tibetan (tingmo, thenthuk)
* East Asian: Chinese (dim sum, mapo tofu, kung pao), Japanese (ramen, sushi, tempura), Korean (bibimbap, kimchi jjigae, tteokbokki)
* Southeast Asian: Thai (pad thai, green curry), Vietnamese (pho, banh mi)
* Western: Italian (pasta, pizza), American (burgers, BBQ), Mexican (tacos, enchiladas)
- Also identify drinks, beverages, packaged food, and branded items.
- NEVER return "no food detected" or zero values. Always make your best estimate.

ACCURACY BENCHMARK:
- Your estimates should be within 10-15% of what a food scale and USDA database would show
- Compare mentally: Would CalAI or a registered dietitian agree with these numbers?
- If your total calories seem high (>600 for a normal home meal), double-check each component

Return ONLY valid JSON:
{"name":"descriptive dish name","calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"sugar":number,"sodium":number,"serving":"portion size","confidence":number,"ingredients":"ingredient1 (amount, cal), ingredient2 (amount, cal), ...","components":[{"item":"component name","portion":"amount","calories":number}]}`;
      }

      let analysis: any = null;

      const models = ["gemini-2.5-flash", "gemini-2.5-pro"];
      for (const model of models) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [{
              role: "user",
              parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: prompt },
              ],
            }],
            config: {
              maxOutputTokens: 2048,
              responseMimeType: "application/json",
            },
          });

          const rawText = response.text || "";
          console.log(`[Food Scanner] ${model} raw response (${rawText.length} chars):`, rawText.substring(0, 500));

          const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
          let jsonMatch = cleaned.match(/\{[\s\S]*\}/);

          if (!jsonMatch && cleaned.startsWith("{")) {
            const fixedJson = cleaned + (cleaned.includes('"ingredients"') ? '"}' : '","ingredients":"unknown"}');
            try {
              JSON.parse(fixedJson);
              jsonMatch = [fixedJson];
            } catch {}
          }

          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              const badNames = ["unknown food", "unknown", "no food detected", "no food", "n/a", "not detected", ""];
              const nameOk = parsed.name && !badNames.includes(parsed.name.toLowerCase().trim());
              const hasValues = (parsed.calories > 0 || parsed.protein > 0 || parsed.carbs > 0);
              if (nameOk && hasValues) {
                analysis = parsed;
                console.log(`[Food Scanner] ${model} identified: ${parsed.name} (${parsed.confidence}% confidence)`);
                break;
              } else if (nameOk) {
                analysis = parsed;
                console.log(`[Food Scanner] ${model} identified (low values): ${parsed.name}`);
                break;
              }
            } catch (parseErr) {
              console.log(`[Food Scanner] ${model} JSON parse failed — skipping model, no synthetic fallback`);
              // No fabricated nutrition values — skip to next model
            }
          }
        } catch (modelErr: any) {
          console.log(`[Food Scanner] ${model} failed: ${modelErr?.message || modelErr}`);
        }
      }

      if (!analysis) {
        return res.status(503).json({
          scanError: true,
          message: "Could not identify the food in this image. Please try a clearer, better-lit photo.",
        });
      }

      // Normalize confidence to 0–100 scale (AI sometimes returns 0–1)
      if (typeof analysis.confidence === "number" && analysis.confidence <= 1) {
        analysis.confidence = Math.round(analysis.confidence * 100);
      }

      // Label scan: strict server-side validation of required numeric fields
      if (scanType === "label") {
        const requiredNumeric = ["calories", "protein", "carbs", "fat"] as const;
        const invalid = requiredNumeric.filter(
          f => typeof analysis[f] !== "number" || isNaN(analysis[f]) || analysis[f] < 0
        );
        if (invalid.length > 0) {
          return res.status(503).json({
            scanError: true,
            message: `Label scan could not extract required nutrients (${invalid.join(", ")}). Try a clearer photo of the nutrition facts panel.`,
          });
        }
        // Cap unrealistic values to catch AI hallucinations
        if (analysis.calories > 5000 || analysis.protein > 500 || analysis.carbs > 1000 || analysis.fat > 500) {
          return res.status(503).json({
            scanError: true,
            message: "Label scan returned implausible values. Try a clearer photo of the nutrition facts panel.",
          });
        }
      }

      analysis.dataSource = "gemini_ai";

      try {
        const nameWords = analysis.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
        const primaryFood = nameWords[nameWords.length - 1] || analysis.name.toLowerCase();

        const dbResults = await storage.searchFoodNutrition(primaryFood, 3);
        if (dbResults.length > 0) {
          analysis.dbReference = {
            food: dbResults[0].food,
            caloriesPer100g: dbResults[0].caloricValue,
            nutritionDensity: dbResults[0].nutritionDensity,
          };
        }

        const productResults = await storage.searchOpenFoodFacts(analysis.name, 1);
        if (productResults.length > 0) {
          analysis.productReference = {
            productName: productResults[0].productName,
            brand: productResults[0].brands,
            nutriScore: productResults[0].nutritionGrade,
          };
        }
      } catch {}

      res.json(analysis);
    } catch (e: any) {
      console.error("Food analysis error:", e?.message || e);
      res.status(503).json({
        scanError: true,
        message: "Could not analyze the image. Please try again with better lighting or a clearer photo.",
      });
    }
  });

  // ─── Audio Transcription (MediaRecorder fallback for voice logging) ───
  app.post("/api/transcribe-audio", isAuthenticated, async (req, res) => {
    try {
      const { audio, mimeType } = req.body;
      if (!audio) return res.status(400).json({ message: "Audio data required" });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType || "audio/webm",
                data: audio,
              }
            },
            { text: "Transcribe the spoken words in this audio clip. Return only the exact transcript text, nothing else. If no speech is detected, return an empty string." }
          ]
        }]
      });
      const transcript = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      return res.json({ transcript });
    } catch (err: any) {
      console.error("Transcription error:", err);
      return res.status(500).json({ message: "Transcription failed" });
    }
  });

  // ─── AI Text-based Food Analysis ──────────────
  app.post("/api/analyze-food-text", async (req, res) => {
    try {
      const { description } = req.body;
      if (!description) return res.status(400).json({ message: "Food description required" });

      let nutritionContext = "";
      try {
        const words = description.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
        let foodMatches: any[] = [];
        let productMatches: any[] = [];
        for (const word of words.slice(0, 4)) {
          const foods = await storage.searchFoodNutrition(word, 3);
          const products = await storage.searchOpenFoodFacts(word, 2);
          foodMatches.push(...foods);
          productMatches.push(...products);
        }
        if (foodMatches.length > 0 || productMatches.length > 0) {
          const foodData = foodMatches.slice(0, 5).map(f =>
            `${f.food}: ${f.caloricValue}cal/100g, P${f.protein}g, C${f.carbohydrates}g, F${f.fat}g, Fiber${f.dietaryFiber}g`
          ).join("\n");
          const prodData = productMatches.slice(0, 3).map(p =>
            `${p.productName}${p.brands ? ` (${p.brands})` : ''}: ${p.energy100g ? Math.round(p.energy100g / 4.184) + 'cal' : '?'}, P${p.proteins100g || '?'}g, C${p.carbohydrates100g || '?'}g, F${p.fat100g || '?'}g`
          ).join("\n");
          nutritionContext = `\nReference data:\n${foodData}\n${prodData}`;
        }
      } catch {}

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [{
            text: `You are a precision nutrition estimation AI similar to CalAI. The user described food: "${description}"

Identify the exact food and provide ACCURATE nutritional information by breaking it into components.
${nutritionContext}

ESTIMATION RULES:
- Break the food into individual components and estimate each one separately, then sum up
- Use CONSERVATIVE portion estimates - when uncertain, use the lower end
- Home-cooked meals use less oil/fat than restaurants
- Rice: 1-1.5 cups cooked = 180-270 cal. Dal: 0.5-0.75 cup = 100-150 cal
- Vegetable curry: 0.5-0.75 cup = 80-150 cal. Ghee/oil: 1-2 tsp = 40-80 cal
- A typical home-cooked South Asian meal plate is 400-600 cal, NOT 700-900
- Your estimates should match what a food scale and USDA database would show
- If total seems high (>600 for a normal home meal), recheck each component
- fiber in grams, sugar in grams, sodium in milligrams
- Never say "unknown" or return zeros

Return ONLY valid JSON:
{"name":"specific food name","calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"sugar":number,"sodium":number,"serving":"serving size","confidence":number,"ingredients":"ingredient1 (amount, cal), ingredient2 (amount, cal), ...","isFood":true}`,
          }],
        }],
        config: { maxOutputTokens: 1024, responseMimeType: "application/json" },
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.json({ name: description, calories: 200, protein: 10, carbs: 25, fat: 8, fiber: 2, sugar: 5, sodium: 300, serving: "1 serving", confidence: 40, ingredients: "estimated", isFood: true });
      }
      const analysis = JSON.parse(jsonMatch[0]);
      analysis.dataSource = "gemini_ai";
      res.json(analysis);
    } catch (e: any) {
      console.error("Text food analysis error:", e?.message || e);
      res.json({ name: req.body.description || "Food Item", calories: 250, protein: 12, carbs: 30, fat: 10, fiber: 2, sugar: 5, sodium: 300, serving: "1 serving", confidence: 30, ingredients: "could not analyze", isFood: true });
    }
  });

  // ─── AI Chat for meal logging ─────────────────
  app.post("/api/chat/analyze", async (req, res) => {
    try {
      const { message, userId } = req.body;
      if (!message) return res.status(400).json({ message: "Message required" });

      let fitnessContext = "";
      let nutritionContext = "";
      try {
        const stats = await storage.getFitnessStats();
        const stepsAnalysis = await storage.getStepsAnalysis();
        const stepsCorrelation = await storage.getStepsCorrelation();
        const goalAnalysis = await storage.getStepsGoalAnalysis();
        fitnessContext = `
Fitness Dataset (${stats.count} profiles):
- Avg calories/workout: ${stats.avgCalories}, Avg duration: ${stats.avgDuration}h
- Avg BMI: ${stats.avgBmi}, Fat%: ${stats.avgFatPct}%, Water: ${stats.avgWaterIntake}L

Step Tracking ML (${stepsAnalysis.totalRecords} days):
- Avg steps: ${stepsAnalysis.avgSteps}, Avg cal: ${stepsAnalysis.avgCalories}
- Correlation r=${stepsCorrelation.stepsToCalories}, Model: ${stepsCorrelation.linearRegression.equation}
- Goal rate: ${goalAnalysis.goalCompletionRate}%, Weight loss potential: ${goalAnalysis.weightLossImpact.potentialWeightLossPerMonthKg} kg/month`;
      } catch {}

      try {
        const words = message.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
        let foodMatches: any[] = [];
        let productMatches: any[] = [];
        for (const word of words.slice(0, 3)) {
          const foods = await storage.searchFoodNutrition(word, 3);
          const products = await storage.searchOpenFoodFacts(word, 3);
          foodMatches.push(...foods);
          productMatches.push(...products);
        }
        if (foodMatches.length > 0 || productMatches.length > 0) {
          const foodData = foodMatches.slice(0, 5).map(f =>
            `${f.food}: ${f.caloricValue}cal, P${f.protein}g, C${f.carbohydrates}g, F${f.fat}g, Fiber${f.dietaryFiber}g, Density${f.nutritionDensity}`
          ).join("\n");
          const prodData = productMatches.slice(0, 5).map(p =>
            `${p.productName}${p.brands ? ` (${p.brands})` : ''}: ${p.energy100g ? Math.round(p.energy100g / 4.184) + 'cal' : '?'}${p.nutritionGrade ? ', Grade ' + p.nutritionGrade.toUpperCase() : ''}, P${p.proteins100g || '?'}g, C${p.carbohydrates100g || '?'}g, F${p.fat100g || '?'}g`
          ).join("\n");
          nutritionContext = `
Reference nutrition data (for context only - use your own knowledge as primary source):
${foodData ? `\nFood DB reference (per 100g):\n${foodData}` : ''}
${prodData ? `\nProduct DB reference (per 100g):\n${prodData}` : ''}

Use your comprehensive training knowledge for accurate nutrition estimates. The database values above are reference points only.`;
        }
      } catch {}

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [{
            text: `You are an expert nutritionist and fitness AI assistant. You have comprehensive knowledge of food nutrition, exercise science, and health.

Context data for reference (supplementary only, rely primarily on your own knowledge):
${fitnessContext}
${nutritionContext}

The user said: "${message}"

Use your own extensive training knowledge to provide the most accurate nutrition and fitness information.
- For food items: identify the specific food accurately and provide precise nutritional estimates based on your knowledge. Be descriptive with food names (e.g. "Pepperoni Pizza with Basil" not just "Pizza").
- For fitness/health questions: provide data-driven insights and practical advice.
- The reference data above is supplementary context only - your own knowledge is the primary source.

Return a JSON object with:
{
  "name": "Specific descriptive name of the food (or 'Fitness Query' if not food-related)",
  "calories": estimated calories (number, 0 if not food),
  "protein": estimated protein in grams (number, 0 if not food),
  "carbs": estimated carbs in grams (number, 0 if not food),
  "fat": estimated fat in grams (number, 0 if not food),
  "fiber": estimated fiber in grams (number, 0 if not food),
  "sugar": estimated sugar in grams (number, 0 if not food),
  "sodium": estimated sodium in milligrams (number, 0 if not food),
  "response": "A friendly, informative response with specific details.",
  "isFood": true/false,
  "dataSource": "gemini_ai"
}
Only return the JSON object, no other text.`,
          }],
        }],
        config: { maxOutputTokens: 1024 },
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.json({ name: "Unknown Food", calories: 300, protein: 15, carbs: 30, fat: 10, fiber: 2, sugar: 5, sodium: 300, response: "I logged that for you with an estimate of 300 calories." });
      }
      const analysis = JSON.parse(jsonMatch[0]);
      res.json(analysis);
    } catch (e: any) {
      console.error("Chat analysis error:", e);
      res.json({ name: "Unknown Food", calories: 300, protein: 15, carbs: 30, fat: 10, fiber: 2, sugar: 5, sodium: 300, response: "I've estimated that meal at around 300 calories and added it." });
    }
  });

  // ─── Smart Fitness Intelligence ──────────────
  app.get("/api/fitness/stats", async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.gender) filters.gender = req.query.gender;
      if (req.query.workoutType) filters.workoutType = req.query.workoutType;
      if (req.query.experienceLevel) filters.experienceLevel = parseInt(req.query.experienceLevel as string);
      if (req.query.ageMin) filters.ageMin = parseInt(req.query.ageMin as string);
      if (req.query.ageMax) filters.ageMax = parseInt(req.query.ageMax as string);
      const stats = await storage.getFitnessStats(filters);
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/fitness/predict-calories", async (req, res) => {
    try {
      const { age, weight, height, gender, workoutType, duration } = req.body;
      if (!age || !weight || !gender || !workoutType) {
        return res.status(400).json({ message: "Missing required fields: age, weight, gender, workoutType" });
      }
      const prediction = await storage.getCaloriePrediction({
        age: parseFloat(age),
        weight: parseFloat(weight),
        height: parseFloat(height || "1.7"),
        gender,
        workoutType,
        duration: parseFloat(duration || "1"),
      });
      res.json(prediction);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/fitness/insights/:userId", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      
      const insights = await storage.getPersonalizedInsights(
        user.age || 25,
        user.weight || 70,
        user.gender || "Male"
      );
      res.json(insights);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/fitness/smart-recommendation", async (req, res) => {
    try {
      const { userId, goal } = req.body;
      const user = await storage.getUser(userId);
      
      const insights = await storage.getPersonalizedInsights(
        user?.age || 25,
        user?.weight || 70,
        user?.gender || "Male"
      );

      const statsContext = `
Based on analysis of 1,324 fitness profiles from our training dataset:
- People similar to this user (age ~${user?.age || 25}, ${user?.weight || 70}kg) burn an average of ${insights.peerStats.avgCalories} calories per session
- Their average workout duration is ${insights.peerStats.avgDuration} hours
- Average workout frequency: ${insights.peerStats.avgFrequency} days/week
- Average water intake: ${insights.peerStats.avgWater} liters
- Average BMI: ${insights.peerStats.avgBmi}, Fat%: ${insights.peerStats.avgFat}%
- Best calorie-burning workout: ${insights.recommendations.bestCalorieBurner} (avg ${insights.recommendations.bestCalorieBurnerAvg} cal)
- Workout breakdown: ${insights.workoutBreakdown.map((w: any) => `${w.workoutType}: avg ${w.avgCalories} cal in ${w.avgDuration}h`).join("; ")}
- Experience levels: ${insights.experienceBreakdown.map((e: any) => `Level ${e.experienceLevel}: avg ${e.avgCalories} cal, ${e.avgFrequency} days/wk, ${e.avgFat}% fat`).join("; ")}
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [{
            text: `You are a smart fitness AI coach trained on real fitness data.
            
${statsContext}

User profile: Age ${user?.age || 25}, Weight ${user?.weight || 70}kg, Goal: ${goal || "general fitness"}
Daily calorie target: ${user?.dailyCalorieTarget || 2400}

Based on this real data analysis, provide a personalized recommendation. Include:
1. A specific workout plan for today
2. Expected calorie burn based on the data
3. Target heart rate zone
4. Water intake recommendation
5. One data-backed insight comparing them to their peer group

Return a JSON object:
{
  "greeting": "personalized greeting",
  "todaysPlan": "specific workout recommendation",
  "expectedCalories": number,
  "targetHeartRate": "range string like 140-170",
  "waterTarget": number in liters,
  "insight": "one interesting data-backed insight",
  "tips": ["tip1", "tip2", "tip3"]
}
Only return the JSON object.`,
          }],
        }],
        config: { maxOutputTokens: 1024 },
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.json({
          greeting: "Ready for a great workout!",
          todaysPlan: `${insights.recommendations.bestCalorieBurner} session for ${insights.peerStats.avgDuration} hours`,
          expectedCalories: insights.peerStats.avgCalories,
          targetHeartRate: `${insights.peerStats.avgBpm || 140}-${170}`,
          waterTarget: insights.peerStats.avgWater,
          insight: `People like you burn an average of ${insights.peerStats.avgCalories} calories per workout.`,
          tips: ["Stay hydrated", "Warm up properly", "Cool down after workout"],
        });
      }
      const recommendation = JSON.parse(jsonMatch[0]);
      res.json({ ...recommendation, dataSource: "1,324 fitness profiles analyzed" });
    } catch (e: any) {
      console.error("Smart recommendation error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Steps Data Intelligence ─────────────────
  app.get("/api/steps/analysis", async (_req, res) => {
    try {
      const analysis = await storage.getStepsAnalysis();
      res.json(analysis);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/steps/correlation", async (_req, res) => {
    try {
      const correlation = await storage.getStepsCorrelation();
      const { linearRegression, ...rest } = correlation;
      res.json({
        ...rest,
        linearRegression: {
          slope: linearRegression.slope,
          intercept: linearRegression.intercept,
          equation: linearRegression.equation,
        },
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/steps/trends", async (_req, res) => {
    try {
      const trends = await storage.getStepsTrends();
      res.json(trends);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/steps/goal-analysis", async (_req, res) => {
    try {
      const goalAnalysis = await storage.getStepsGoalAnalysis();
      res.json(goalAnalysis);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/steps/data", async (_req, res) => {
    try {
      const data = await storage.getAllStepsData();
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/steps/predict", async (req, res) => {
    try {
      const { targetSteps } = req.body;
      if (!targetSteps) return res.status(400).json({ message: "targetSteps required" });
      const correlation = await storage.getStepsCorrelation();
      const predictedCalories = correlation.linearRegression.predictCalories(targetSteps);
      const analysis = await storage.getStepsAnalysis();

      res.json({
        targetSteps,
        predictedCalories,
        equation: correlation.linearRegression.equation,
        caloriesPer1000Steps: correlation.caloriesPer1000Steps,
        avgSteps: analysis.avgSteps,
        avgCalories: analysis.avgCalories,
        comparedToAvg: targetSteps > analysis.avgSteps ? "above" : "below",
        percentAboveAvg: Math.round(((targetSteps - analysis.avgSteps) / analysis.avgSteps) * 100),
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/steps/weight-loss-impact", async (req, res) => {
    try {
      const { dailyStepTarget } = req.body;
      const correlation = await storage.getStepsCorrelation();
      const analysis = await storage.getStepsAnalysis();
      const goalAnalysis = await storage.getStepsGoalAnalysis();

      const currentAvgCalories = analysis.avgCalories;
      const targetCalories = correlation.linearRegression.predictCalories(dailyStepTarget || 10000);
      const extraDailyCalories = targetCalories - currentAvgCalories;

      res.json({
        currentAvgSteps: analysis.avgSteps,
        currentAvgCalories: currentAvgCalories,
        targetSteps: dailyStepTarget || 10000,
        targetCalories,
        extraDailyCalories: Math.max(0, extraDailyCalories),
        weeklyExtraCalories: Math.max(0, extraDailyCalories * 7),
        monthlyExtraCalories: Math.max(0, extraDailyCalories * 30),
        potentialWeightLossPerMonthKg: Math.round(Math.max(0, extraDailyCalories * 30 / 7700) * 10) / 10,
        goalCompletionRate: goalAnalysis.goalCompletionRate,
        dataPoints: analysis.totalRecords,
        trackingPeriod: "March 2021 - September 2022",
        correlation: correlation.stepsToCalories,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Food Nutrition Database Intelligence ─────────
  app.get("/api/nutrition/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) return res.status(400).json({ message: "Query must be at least 2 characters" });
      const limit = parseInt(req.query.limit as string) || 20;
      const results = await storage.searchFoodNutrition(query, limit);
      res.json(results);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/nutrition/stats", async (_req, res) => {
    try {
      const stats = await storage.getFoodNutritionStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/nutrition/similar/:food", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await storage.findSimilarFoods(req.params.food, limit);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/nutrition/health-score", async (req, res) => {
    try {
      const { food } = req.body;
      if (!food) return res.status(400).json({ message: "food name required" });
      const result = await storage.getFoodHealthScore(food);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/nutrition/nutrient-gap/:userId", async (req, res) => {
    try {
      const result = await storage.getNutrientGapAnalysis(req.params.userId);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/nutrition/overview", async (_req, res) => {
    try {
      const overview = await storage.getNutritionDatabaseOverview();
      res.json(overview);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Open Food Facts Product Database ─────────
  app.get("/api/products/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) return res.status(400).json({ message: "Query must be at least 2 characters" });
      const limit = parseInt(req.query.limit as string) || 20;
      const results = await storage.searchOpenFoodFacts(query, limit);
      res.json(results);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/products/grades", async (_req, res) => {
    try {
      const grades = await storage.getOpenFoodFactsGrades();
      res.json(grades);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Seed data endpoint (for initial data) ─
  app.post("/api/seed", async (_req, res) => {
    try {
      const existingExercises = await storage.getExercises();
      if (existingExercises.length > 0) {
        return res.json({ message: "Data already seeded" });
      }

      const exerciseData = [
        { name: "Bench Press", category: "Gym", equipment: "Barbell", difficulty: "Intermediate", instructions: "Lie on a flat bench. Grip the barbell slightly wider than shoulder-width. Lower the bar to your chest, then press it back up.", videoUrl: "https://www.youtube.com/watch?v=vcBig73ojpE", primaryMuscles: ["chest"], secondaryMuscles: ["triceps", "shoulders"], sets: 4, reps: "8-10", restSeconds: 90 },
        { name: "Incline Dumbbell Press", category: "Gym", equipment: "Dumbbells", difficulty: "Intermediate", instructions: "Set bench to 30-45 degrees. Press dumbbells up from shoulder level until arms are extended.", videoUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8", primaryMuscles: ["chest"], secondaryMuscles: ["shoulders", "triceps"], sets: 3, reps: "10-12", restSeconds: 60 },
        { name: "Cable Flyes", category: "Gym", equipment: "Cable Machine", difficulty: "Beginner", instructions: "Stand between cable stations. With arms slightly bent, bring handles together in front of your chest.", videoUrl: "https://www.youtube.com/watch?v=Iwe6AmxVf7o", primaryMuscles: ["chest"], secondaryMuscles: ["shoulders"], sets: 3, reps: "12-15", restSeconds: 45 },
        { name: "Tricep Pushdowns", category: "Gym", equipment: "Cable Machine", difficulty: "Beginner", instructions: "Stand at a cable machine with a straight bar attachment. Push the bar down by extending your elbows.", videoUrl: "https://www.youtube.com/watch?v=2-LAMcpzODU", primaryMuscles: ["triceps"], secondaryMuscles: [], sets: 3, reps: "12-15", restSeconds: 45 },
        { name: "Barbell Squat", category: "Gym", equipment: "Barbell", difficulty: "Advanced", instructions: "Place barbell on upper traps. Stand shoulder-width apart. Squat down until thighs are parallel, then drive up.", videoUrl: "https://www.youtube.com/watch?v=ultWZbUMPL8", primaryMuscles: ["quads", "glutes"], secondaryMuscles: ["hamstrings", "core"], sets: 4, reps: "6-8", restSeconds: 120 },
        { name: "Romanian Deadlift", category: "Gym", equipment: "Barbell", difficulty: "Intermediate", instructions: "Hold barbell at hip level. Hinge at hips, lowering bar along legs while keeping back straight. Return to standing.", videoUrl: "https://www.youtube.com/watch?v=JCXUYuzwNrM", primaryMuscles: ["hamstrings", "glutes"], secondaryMuscles: ["lower back"], sets: 3, reps: "10-12", restSeconds: 90 },
        { name: "Pull-ups", category: "Bodyweight", equipment: "Pull-up Bar", difficulty: "Advanced", instructions: "Hang from bar with overhand grip. Pull yourself up until chin clears the bar. Lower with control.", videoUrl: "https://www.youtube.com/watch?v=eGo4IYlbE5g", primaryMuscles: ["lats", "biceps"], secondaryMuscles: ["core", "forearms"], sets: 4, reps: "6-10", restSeconds: 90 },
        { name: "Push-ups", category: "Bodyweight", equipment: "None", difficulty: "Beginner", instructions: "Place hands shoulder-width apart on the floor. Lower chest to the ground, then push back up.", videoUrl: "https://www.youtube.com/watch?v=IODxDxX7oi4", primaryMuscles: ["chest", "triceps"], secondaryMuscles: ["shoulders", "core"], sets: 3, reps: "15-20", restSeconds: 45 },
        { name: "Mountain Climbers", category: "Cardio", equipment: "None", difficulty: "Intermediate", instructions: "Start in a plank position. Drive one knee to your chest, then switch legs quickly.", videoUrl: "https://www.youtube.com/watch?v=nmwgirgXLYM", primaryMuscles: ["core", "quads"], secondaryMuscles: ["shoulders", "hip flexors"], sets: 3, reps: "30 sec", restSeconds: 30 },
        { name: "Burpees", category: "Cardio", equipment: "None", difficulty: "Advanced", instructions: "Squat down, place hands on floor, jump feet back to plank, do a push-up, jump feet forward, jump up.", videoUrl: "https://www.youtube.com/watch?v=dZgVxmf6jkA", primaryMuscles: ["full body"], secondaryMuscles: ["cardio"], sets: 3, reps: "10-15", restSeconds: 45 },
        { name: "Plank", category: "Bodyweight", equipment: "None", difficulty: "Beginner", instructions: "Hold a push-up position on your forearms. Keep your body in a straight line from head to heels.", videoUrl: "https://www.youtube.com/watch?v=ASdvN_XEl_c", primaryMuscles: ["core", "abs"], secondaryMuscles: ["shoulders", "glutes"], sets: 3, reps: "45-60 sec", restSeconds: 30 },
        { name: "Lateral Raises", category: "Gym", equipment: "Dumbbells", difficulty: "Beginner", instructions: "Stand with dumbbells at your sides. Raise arms out to the sides until parallel with the floor.", videoUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo", primaryMuscles: ["shoulders"], secondaryMuscles: ["traps"], sets: 3, reps: "12-15", restSeconds: 45 },
      ];

      for (const ex of exerciseData) {
        await storage.createExercise(ex);
      }

      const createdExercises = await storage.getExercises();
      const exerciseMap = new Map(createdExercises.map(e => [e.name, e.id]));

      const workoutPlanData = [
        { title: "Upper Body Power", description: "A comprehensive chest and tricep routine focusing on compound movements for maximum strength gains.", category: "Gym", difficulty: "Advanced", durationMinutes: 45, estimatedCalories: 320, image: "/images/exercise-bench-press.png", exerciseIds: [exerciseMap.get("Bench Press")!, exerciseMap.get("Incline Dumbbell Press")!, exerciseMap.get("Cable Flyes")!, exerciseMap.get("Tricep Pushdowns")!] },
        { title: "HIIT Cardio Blast", description: "High-intensity interval training to torch calories and boost cardiovascular fitness.", category: "Cardio", difficulty: "Intermediate", durationMinutes: 20, estimatedCalories: 250, image: "https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?q=80&w=1000&auto=format&fit=crop", exerciseIds: [exerciseMap.get("Mountain Climbers")!, exerciseMap.get("Burpees")!] },
        { title: "Core Crusher", description: "Targeted core workout to build a strong midsection and improve stability.", category: "Bodyweight", difficulty: "Beginner", durationMinutes: 15, estimatedCalories: 120, image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1000&auto=format&fit=crop", exerciseIds: [exerciseMap.get("Plank")!, exerciseMap.get("Mountain Climbers")!] },
        { title: "Lower Body Strength", description: "Build powerful legs with compound barbell movements and targeted isolation work.", category: "Gym", difficulty: "Intermediate", durationMinutes: 50, estimatedCalories: 380, image: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=1000&auto=format&fit=crop", exerciseIds: [exerciseMap.get("Barbell Squat")!, exerciseMap.get("Romanian Deadlift")!] },
      ];

      for (const plan of workoutPlanData) {
        await storage.createWorkoutPlan(plan);
      }

      const mealPlanData = [
        { name: "Chicken Curry & Rice", cuisine: "Indian", dietType: "non-veg", calories: 450, protein: 35, carbs: 50, fat: 12, ingredients: ["Chicken breast", "Basmati rice", "Onion", "Tomato", "Garam masala", "Turmeric", "Yogurt"], instructions: "Marinate chicken in yogurt and spices. Cook onions and tomatoes until soft, add chicken and simmer. Serve with steamed basmati rice.", image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?q=80&w=1000&auto=format&fit=crop", tags: ["High Protein", "Spicy"] },
        { name: "Dal Bhat Power", cuisine: "Nepali", dietType: "vegetarian", calories: 550, protein: 20, carbs: 85, fat: 10, ingredients: ["Yellow lentils", "Rice", "Spinach", "Ghee", "Cumin", "Garlic", "Green chili"], instructions: "Cook lentils with turmeric and salt until soft. Temper with cumin and garlic in ghee. Serve with steamed rice and sautéed spinach.", image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=1000&auto=format&fit=crop", tags: ["Vegetarian", "Staple"] },
        { name: "Szechuan Tofu Stir-fry", cuisine: "Chinese", dietType: "vegetarian", calories: 380, protein: 25, carbs: 30, fat: 18, ingredients: ["Firm tofu", "Bell peppers", "Szechuan peppercorns", "Soy sauce", "Ginger", "Garlic", "Sesame oil"], instructions: "Press and cube tofu. Stir-fry with vegetables in sesame oil with Szechuan pepper, soy sauce, and ginger. Serve over steamed rice.", image: "https://images.unsplash.com/photo-1525755662778-989d64d6a63c?q=80&w=1000&auto=format&fit=crop", tags: ["Vegan", "Spicy"] },
        { name: "Paneer Tikka Masala", cuisine: "Indian", dietType: "vegetarian", calories: 420, protein: 22, carbs: 28, fat: 24, ingredients: ["Paneer", "Tomato puree", "Cream", "Onion", "Ginger-garlic paste", "Kashmiri chili", "Fenugreek leaves"], instructions: "Grill marinated paneer cubes. Make gravy with onion, tomato, and cream. Add grilled paneer to gravy and garnish with fenugreek.", image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=1000&auto=format&fit=crop", tags: ["Vegetarian", "Keto-friendly"] },
        { name: "Kung Pao Chicken", cuisine: "Chinese", dietType: "non-veg", calories: 480, protein: 38, carbs: 25, fat: 22, ingredients: ["Chicken thigh", "Peanuts", "Dried chilies", "Soy sauce", "Rice vinegar", "Scallions", "Cornstarch"], instructions: "Stir-fry diced chicken until golden. Add dried chilies, peanuts, and sauce mixture. Toss with scallions and serve with steamed rice.", image: "https://images.unsplash.com/photo-1525755662778-989d64d6a63c?q=80&w=1000&auto=format&fit=crop", tags: ["High Protein", "Spicy"] },
        { name: "Momo (Steamed Dumplings)", cuisine: "Nepali", dietType: "non-veg", calories: 350, protein: 22, carbs: 35, fat: 14, ingredients: ["Minced chicken", "Onion", "Coriander", "Ginger", "Flour", "Soy sauce", "Sesame oil"], instructions: "Mix minced chicken with chopped onion, coriander, ginger, soy sauce. Wrap in dough circles and steam for 15 minutes. Serve with tomato achar.", image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=1000&auto=format&fit=crop", tags: ["High Protein", "Steamed"] },
        { name: "Egg Fried Rice", cuisine: "Chinese", dietType: "eggetarian", calories: 400, protein: 18, carbs: 55, fat: 12, ingredients: ["Eggs", "Day-old rice", "Soy sauce", "Sesame oil", "Scallions", "Peas", "Carrots"], instructions: "Scramble eggs in wok. Add cold rice, vegetables, soy sauce, and sesame oil. Stir-fry on high heat until rice is slightly crispy.", image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?q=80&w=1000&auto=format&fit=crop", tags: ["Quick", "Comfort Food"] },
        { name: "Aloo Gobi Masala", cuisine: "Indian", dietType: "vegetarian", calories: 320, protein: 8, carbs: 45, fat: 14, ingredients: ["Potato", "Cauliflower", "Tomato", "Turmeric", "Cumin", "Coriander", "Green chili"], instructions: "Sauté cubed potatoes and cauliflower florets with spices. Add tomatoes and cook until vegetables are tender. Garnish with fresh coriander.", image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=1000&auto=format&fit=crop", tags: ["Vegetarian", "Low Calorie"] },
      ];

      for (const mp of mealPlanData) {
        await storage.createMealPlan(mp);
      }

      res.json({ message: "Seed data created successfully" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Admin Routes ───────────────────────────
  app.get("/api/admin/users", isAuthenticated, requireRole('admin'), async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/admin/users/:id/role", isAuthenticated, requireRole('admin'), async (req, res) => {
    try {
      const { role } = req.body;
      if (!role || !["admin", "coach", "client"].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be admin, coach, or client." });
      }
      const user = await storage.updateUser(req.params.id, { role });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/admin/users/:id/coach", isAuthenticated, requireRole('admin'), async (req, res) => {
    try {
      const { coachId } = req.body;
      const user = await storage.updateUser(req.params.id, { coachId: coachId || null });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Coach Routes ───────────────────────────
  app.get("/api/coach/clients", isAuthenticated, requireRole('admin', 'coach'), async (req, res) => {
    try {
      const coachId = req.query.coachId as string;
      if (!coachId) return res.status(400).json({ message: "coachId required" });
      const clients = await storage.getClientsByCoachId(coachId);
      const clientsWithStats = await Promise.all(
        clients.map(async (client) => {
          const today = new Date().toISOString().split("T")[0];
          const meals = await storage.getMealLogs(client.id, today);
          const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
          return {
            ...client,
            todayCalories: totalCalories,
            mealCount: meals.length,
          };
        })
      );
      res.json(clientsWithStats);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Invite Codes ───────────────────────────
  app.post("/api/coach/invite-codes", isAuthenticated, requireRole('coach'), async (req: any, res) => {
    try {
      const coachId = req.authUser?.id;
      if (!coachId) return res.status(401).json({ message: "Unauthorized" });
      const code = crypto.randomBytes(4).toString("hex").toUpperCase();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const inviteCode = await storage.createInviteCode({ code, coachId, expiresAt });
      res.status(201).json(inviteCode);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/coach/invite-codes", isAuthenticated, requireRole('coach'), async (req: any, res) => {
    try {
      const coachId = req.authUser?.id;
      if (!coachId) return res.status(401).json({ message: "Unauthorized" });
      const codes = await storage.getInviteCodesByCoach(coachId);
      res.json(codes);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/client/join-coach", isAuthenticated, async (req: any, res) => {
    try {
      const clientId = req.authUser?.id;
      if (!clientId) return res.status(401).json({ message: "Unauthorized" });
      const { code } = req.body;
      if (!code) return res.status(400).json({ message: "Invite code required" });

      const inviteCode = await storage.getInviteCodeByCode(code.toUpperCase());
      if (!inviteCode) return res.status(404).json({ message: "Invalid invite code" });
      if (inviteCode.usedBy) return res.status(400).json({ message: "Code already used" });
      if (inviteCode.expiresAt && new Date(inviteCode.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Code has expired" });
      }

      const used = await storage.useInviteCode(code.toUpperCase(), clientId);
      if (!used) return res.status(400).json({ message: "Failed to use code" });

      await storage.updateUser(clientId, { coachId: inviteCode.coachId });
      const coach = await storage.getUser(inviteCode.coachId);
      res.json({ message: "Successfully joined coach", coachName: coach?.name || coach?.firstName || "Coach", coachId: inviteCode.coachId });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Coach Plans ───────────────────────────
  app.post("/api/coach/plans", isAuthenticated, requireRole('coach'), async (req: any, res) => {
    try {
      const coachId = req.authUser?.id;
      if (!coachId) return res.status(401).json({ message: "Unauthorized" });
      const parsed = insertCoachPlanSchema.parse({ ...req.body, coachId });
      const plan = await storage.createCoachPlan(parsed);
      res.status(201).json(plan);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/coach/plans", isAuthenticated, requireRole('coach'), async (req: any, res) => {
    try {
      const coachId = req.authUser?.id;
      if (!coachId) return res.status(401).json({ message: "Unauthorized" });
      const plans = await storage.getCoachPlansByCoach(coachId);
      res.json(plans);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/client/plans", isAuthenticated, async (req: any, res) => {
    try {
      const clientId = req.authUser?.id;
      if (!clientId) return res.status(401).json({ message: "Unauthorized" });
      const plans = await storage.getCoachPlansByClient(clientId);
      res.json(plans);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/coach/plans/:id", isAuthenticated, requireRole('coach'), async (req: any, res) => {
    try {
      const coachId = req.authUser?.id;
      const plan = await storage.getCoachPlan(req.params.id);
      if (!plan) return res.status(404).json({ message: "Plan not found" });
      if (plan.coachId !== coachId) return res.status(403).json({ message: "Not your plan" });
      await storage.deleteCoachPlan(req.params.id);
      res.json({ message: "Plan deleted" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Messaging ────────────────────────────
  async function validateCoachClientRelationship(userIdA: string, userIdB: string): Promise<{ valid: boolean; error?: string }> {
    const [userA, userB] = await Promise.all([
      storage.getUser(userIdA),
      storage.getUser(userIdB),
    ]);
    if (!userA) return { valid: false, error: `User ${userIdA} not found` };
    if (!userB) return { valid: false, error: `User ${userIdB} not found` };
    const isClientToCoach = userA.coachId === userB.id;
    const isCoachToClient = userB.coachId === userA.id;
    if (!isClientToCoach && !isCoachToClient) {
      return { valid: false, error: "Users do not have a coach-client relationship" };
    }
    return { valid: true };
  }

  app.post("/api/messages", async (req, res) => {
    try {
      const { senderId, receiverId, content } = req.body;
      if (!senderId || !receiverId || !content?.trim()) {
        return res.status(400).json({ message: "senderId, receiverId, and content are required" });
      }
      const relationship = await validateCoachClientRelationship(senderId, receiverId);
      if (!relationship.valid) {
        return res.status(403).json({ message: relationship.error });
      }
      const msg = await storage.createMessage({ senderId, receiverId, content: content.trim() });
      res.status(201).json(msg);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/messages/:userId1/:userId2", async (req, res) => {
    try {
      const relationship = await validateCoachClientRelationship(req.params.userId1, req.params.userId2);
      if (!relationship.valid) {
        return res.status(403).json({ message: relationship.error });
      }
      const msgs = await storage.getMessages(req.params.userId1, req.params.userId2);
      res.json(msgs);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/conversations/:userId", async (req, res) => {
    try {
      const convs = await storage.getConversations(req.params.userId);
      res.json(convs);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/messages/read", async (req, res) => {
    try {
      const { senderId, receiverId } = req.body;
      if (!senderId || !receiverId) return res.status(400).json({ message: "senderId and receiverId required" });
      const relationship = await validateCoachClientRelationship(receiverId, senderId);
      if (!relationship.valid) {
        return res.status(403).json({ message: relationship.error });
      }
      await storage.markMessagesRead(senderId, receiverId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Coach Dashboard Analytics ───────────────────
  app.get("/api/coach/clients/:clientId/summary", isAuthenticated as RequestHandler, requireRole('coach'), async (req: any, res) => {
    try {
      const coachId = req.authUser?.id;
      const client = await storage.getUser(req.params.clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (client.coachId !== coachId) return res.status(403).json({ message: "Not your client" });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayMeals = await storage.getMealLogs(client.id, today.toISOString().split('T')[0]);
      const todayWorkouts = await storage.getWorkoutLogs(client.id);
      const todayWorkoutsFiltered = todayWorkouts.filter(w => w.loggedAt && w.loggedAt >= today && w.loggedAt <= endOfDay);
      const waterLogs = await storage.getWaterLogs(client.id);
      const activePlans = await storage.getCoachPlansByClient(client.id);
      const activePlansCount = activePlans.filter(p => p.status === 'active').length;

      const { password: _, ...profile } = client;

      res.json({
        profile: {
          name: profile.name,
          age: profile.age,
          weight: profile.weight,
          height: profile.height,
          targetWeight: profile.targetWeight,
          dailyCalorieTarget: profile.dailyCalorieTarget,
          proteinTarget: profile.proteinTarget,
          carbsTarget: profile.carbsTarget,
          fatTarget: profile.fatTarget,
          dietType: profile.dietType,
          cuisinePreference: profile.cuisinePreference,
          activityLevel: profile.activityLevel,
          gender: profile.gender,
        },
        todayMeals: {
          totalCalories: todayMeals.reduce((sum, m) => sum + m.calories, 0),
          totalProtein: Math.round(todayMeals.reduce((sum, m) => sum + m.protein, 0) * 10) / 10,
          totalCarbs: Math.round(todayMeals.reduce((sum, m) => sum + m.carbs, 0) * 10) / 10,
          totalFat: Math.round(todayMeals.reduce((sum, m) => sum + m.fat, 0) * 10) / 10,
          mealCount: todayMeals.length,
        },
        todayWorkouts: {
          totalCaloriesBurned: todayWorkoutsFiltered.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0),
          workoutCount: todayWorkoutsFiltered.length,
        },
        activePlansCount,
        waterIntakeToday: waterLogs.reduce((sum, w) => sum + w.amount, 0),
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/coach/clients/:clientId/nutrition-analytics", isAuthenticated as RequestHandler, requireRole('coach'), async (req: any, res) => {
    try {
      const coachId = req.authUser?.id;
      const client = await storage.getUser(req.params.clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (client.coachId !== coachId) return res.status(403).json({ message: "Not your client" });

      const range = parseInt(req.query.range as string) || 7;
      const days = range === 30 ? 30 : 7;
      const analytics = await storage.getClientNutritionAnalytics(client.id, days);
      res.json(analytics);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/coach/clients/:clientId/fitness-analytics", isAuthenticated as RequestHandler, requireRole('coach'), async (req: any, res) => {
    try {
      const coachId = req.authUser?.id;
      const client = await storage.getUser(req.params.clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (client.coachId !== coachId) return res.status(403).json({ message: "Not your client" });

      const range = parseInt(req.query.range as string) || 7;
      const days = range === 30 ? 30 : 7;
      const analytics = await storage.getClientFitnessAnalytics(client.id, days);
      res.json(analytics);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/coach/clients/:clientId/progress", isAuthenticated as RequestHandler, requireRole('coach'), async (req: any, res) => {
    try {
      const coachId = req.authUser?.id;
      const client = await storage.getUser(req.params.clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (client.coachId !== coachId) return res.status(403).json({ message: "Not your client" });

      const nutritionData = await storage.getClientNutritionAnalytics(client.id, 7);
      const dailyBreakdown = nutritionData.dailyBreakdown as { calories: number; protein: number }[];

      const calorieTarget = client.dailyCalorieTarget || 2400;
      const proteinTarget = client.proteinTarget || 160;

      let avgCaloriePct = 0;
      let avgProteinPct = 0;
      if (dailyBreakdown.length > 0) {
        const avgCalories = dailyBreakdown.reduce((sum, d) => sum + d.calories, 0) / dailyBreakdown.length;
        const avgProtein = dailyBreakdown.reduce((sum, d) => sum + d.protein, 0) / dailyBreakdown.length;
        avgCaloriePct = Math.round((avgCalories / calorieTarget) * 100);
        avgProteinPct = Math.round((avgProtein / proteinTarget) * 100);
      }

      res.json({
        goalAchievement: {
          avgCaloriesPct: avgCaloriePct,
          avgProteinPct: avgProteinPct,
          daysTracked: dailyBreakdown.length,
        },
        weight: {
          current: client.weight,
          target: client.targetWeight,
        },
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/coach/clients/:clientId/goals", isAuthenticated as RequestHandler, requireRole('coach'), async (req: any, res) => {
    try {
      const coachId = req.authUser?.id;
      const client = await storage.getUser(req.params.clientId);
      if (!client) return res.status(404).json({ message: "Client not found" });
      if (client.coachId !== coachId) return res.status(403).json({ message: "Not your client" });

      const { dailyCalorieTarget, proteinTarget, carbsTarget, fatTarget, targetWeight } = req.body;
      const updateData: any = {};
      if (dailyCalorieTarget !== undefined) updateData.dailyCalorieTarget = dailyCalorieTarget;
      if (proteinTarget !== undefined) updateData.proteinTarget = proteinTarget;
      if (carbsTarget !== undefined) updateData.carbsTarget = carbsTarget;
      if (fatTarget !== undefined) updateData.fatTarget = fatTarget;
      if (targetWeight !== undefined) updateData.targetWeight = targetWeight;

      const updated = await storage.updateUser(client.id, updateData);
      if (!updated) return res.status(500).json({ message: "Failed to update" });
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/food-search", isAuthenticated, async (req: any, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (q.length < 2) return res.json([]);
      const results = await storage.searchFoodNutrition(q, 10);
      const mapped = results.map((f: any) => ({
        name: f.food,
        calories: Math.round(f.caloricValue || 0),
        protein: Math.round((f.protein || 0) * 10) / 10,
        carbs: Math.round((f.carbohydrates || 0) * 10) / 10,
        fat: Math.round((f.fat || 0) * 10) / 10,
        fiber: Math.round((f.dietaryFiber || 0) * 10) / 10,
        sugar: Math.round((f.sugars || 0) * 10) / 10,
        sodium: Math.round((f.sodium || 0) * 10) / 10,
        source: "database",
      }));
      res.json(mapped);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Weight Logs ──────────────────────────────
  app.get("/api/weight-logs", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.authUser;
      const days = parseInt(String(req.query.days || "90"));
      const logs = await storage.getWeightLogs(user.id, days);
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/weight-logs", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.authUser;
      const { weightKg, date, notes } = req.body;
      const wKg = Number(weightKg);
      if (!Number.isFinite(wKg) || wKg <= 0 || wKg > 500) {
        return res.status(400).json({ message: "Valid weight required (0–500 kg)" });
      }
      const log = await storage.createWeightLog({
        userId: user.id,
        weightKg: wKg,
        date: date || new Date().toISOString().split("T")[0],
        notes: notes || null,
      });
      // Only sync users.weight when the log date is today (not backdated entries)
      const userRecord = await storage.getUser(user.id);
      const heightM = userRecord?.height ? userRecord.height / 100 : null;
      const bmi = heightM && heightM > 0 ? Math.round((wKg / (heightM * heightM)) * 10) / 10 : null;
      const today = new Date().toISOString().split("T")[0];
      const logDate = date || today;
      if (logDate === today) {
        await storage.updateUser(user.id, { weight: wKg });
      }
      res.json({ ...log, bmi });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/weight-logs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.authUser;
      await storage.deleteWeightLog(req.params.id, user.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Saved Foods ──────────────────────────────
  app.get("/api/saved-foods", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.authUser;
      const foods = await storage.getSavedFoods(user.id);
      res.json(foods);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/saved-foods", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.authUser;
      const { name, calories, protein, carbs, fat, fiber, sugar, sodium, source } = req.body;
      if (!name || calories === undefined) return res.status(400).json({ message: "Name and calories required" });
      const food = await storage.saveFood({
        userId: user.id,
        name, calories: Math.round(calories),
        protein: protein || 0, carbs: carbs || 0,
        fat: fat || 0, fiber: fiber || 0,
        sugar: sugar || 0, sodium: sodium || 0,
        source: source || "manual",
      });
      res.json(food);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/saved-foods/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.authUser;
      await storage.unsaveFood(req.params.id, user.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Grocery Items ──────────────────────────────
  app.get("/api/grocery", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.authUser;
      const planId = req.query.planId ? String(req.query.planId) : undefined;
      const items = await storage.getGroceryItems(user.id, planId);
      res.json(items);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/grocery/seed", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.authUser;
      const { planId, items } = req.body;
      if (!planId || !Array.isArray(items)) return res.status(400).json({ message: "planId and items required" });
      const result = await storage.seedGroceryFromPlan(user.id, planId, items);
      if (result === "not_owned") return res.status(403).json({ message: "Plan not found or not owned by you" });
      const grocery = await storage.getGroceryItems(user.id, planId);
      res.json(grocery);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/grocery", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.authUser;
      const { item, category, planId } = req.body;
      if (!item) return res.status(400).json({ message: "Item required" });
      const row = await storage.createGroceryItem({ userId: user.id, item, category: category || "Other", planId: planId || null, checked: false });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/grocery/:id/toggle", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.authUser;
      const { checked } = req.body;
      const row = await storage.toggleGroceryItem(req.params.id, user.id, !!checked);
      if (!row) return res.status(404).json({ message: "Item not found or not owned by you" });
      res.json(row);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/grocery/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.authUser;
      await storage.deleteGroceryItem(req.params.id, user.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Meal Templates ──────────────────────────────
  app.get("/api/meal-templates", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.authUser;
      const templates = await storage.getMealTemplates(user.id);
      res.json(templates);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/meal-templates", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.authUser;
      const { name, foods } = req.body;
      if (!name || !Array.isArray(foods) || foods.length < 1) {
        return res.status(400).json({ message: "name and at least 1 food required" });
      }
      const totalCalories = foods.reduce((s: number, f: any) => s + (f.calories || 0), 0);
      const template = await storage.createMealTemplate({ userId: user.id, name, foods, totalCalories });
      res.json(template);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/meal-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.authUser;
      await storage.deleteMealTemplate(req.params.id, user.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  return httpServer;
}
