import { eq, and, gte, lte, desc, sql, between, ilike, or, asc } from "drizzle-orm";
import { db } from "./db";
import {
  users, mealLogs, waterLogs, exercises, workoutPlans, workoutLogs, mealPlans, fitnessData, stepsData, foodNutrition, openFoodFacts, inviteCodes, coachPlans, messages, onboardingProfiles, generatedPlans,
  conversationSessions, conversationMessages, activityLogs, weeklyMealPresets, nutritionInsights, progressPhotos, mealReminders,
  weightLogs, savedFoods, groceryItems, mealTemplates,
  type User, type InsertUser,
  type MealLog, type InsertMealLog,
  type WaterLog, type InsertWaterLog,
  type Exercise, type InsertExercise,
  type WorkoutPlan, type InsertWorkoutPlan,
  type WorkoutLog, type InsertWorkoutLog,
  type MealPlan, type InsertMealPlan,
  type FitnessData,
  type FoodNutrition,
  type OpenFoodFact,
  type InviteCode, type InsertInviteCode,
  type CoachPlan, type InsertCoachPlan,
  type Message, type InsertMessage,
  type OnboardingProfile, type InsertOnboardingProfile,
  type GeneratedPlan, type InsertGeneratedPlan,
  type ConversationSession, type InsertConversationSession,
  type ConversationMessage, type InsertConversationMessage,
  type ActivityLog, type InsertActivityLog,
  type WeeklyMealPreset, type InsertWeeklyMealPreset,
  type NutritionInsight, type InsertNutritionInsight,
  type ProgressPhoto, type InsertProgressPhoto,
  type MealReminder, type InsertMealReminder,
  type WeightLog, type InsertWeightLog,
  type SavedFood, type InsertSavedFood,
  type GroceryItem, type InsertGroceryItem,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserBySupabaseId(supabaseId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getClientsByCoachId(coachId: string): Promise<User[]>;

  getMealLogs(userId: string, date?: string): Promise<MealLog[]>;
  createMealLog(log: InsertMealLog): Promise<MealLog>;
  updateMealLog(id: string, data: Partial<InsertMealLog>): Promise<MealLog | undefined>;
  deleteMealLog(id: string): Promise<void>;

  getWaterLogs(userId: string, date?: string): Promise<WaterLog[]>;
  createWaterLog(log: InsertWaterLog): Promise<WaterLog>;
  deleteWaterLog(id: string, reduceAmount?: number): Promise<void>;

  getExercises(category?: string): Promise<Exercise[]>;
  getExercise(id: string): Promise<Exercise | undefined>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;

  getWorkoutPlans(category?: string): Promise<WorkoutPlan[]>;
  getWorkoutPlan(id: string): Promise<WorkoutPlan | undefined>;
  createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan>;

  getWorkoutLogs(userId: string): Promise<WorkoutLog[]>;
  createWorkoutLog(log: InsertWorkoutLog): Promise<WorkoutLog>;
  deleteWorkoutLog(id: string): Promise<void>;

  getMealPlans(cuisine?: string, dietType?: string): Promise<MealPlan[]>;
  getMealPlan(id: string): Promise<MealPlan | undefined>;
  createMealPlan(plan: InsertMealPlan): Promise<MealPlan>;

  getFitnessStats(filters?: { gender?: string; ageMin?: number; ageMax?: number; workoutType?: string; experienceLevel?: number }): Promise<any>;
  getCaloriePrediction(params: { age: number; weight: number; height: number; gender: string; workoutType: string; duration: number }): Promise<any>;
  getPersonalizedInsights(userAge: number, userWeight: number, userGender: string): Promise<any>;
  getStepsAnalysis(): Promise<any>;
  getStepsCorrelation(): Promise<any>;
  getStepsTrends(): Promise<any>;
  getStepsGoalAnalysis(): Promise<any>;
  getAllStepsData(): Promise<any[]>;

  getWeeklyMealHistory(userId: string): Promise<any[]>;
  getMealHistory(userId: string, startDate: string, endDate: string): Promise<MealLog[]>;

  searchFoodNutrition(query: string, limit?: number): Promise<FoodNutrition[]>;
  getFoodNutritionStats(): Promise<any>;
  findSimilarFoods(foodName: string, limit?: number): Promise<any>;
  getFoodHealthScore(foodName: string): Promise<any>;
  getNutrientGapAnalysis(userId: string): Promise<any>;
  searchOpenFoodFacts(query: string, limit?: number): Promise<OpenFoodFact[]>;
  getOpenFoodFactsGrades(): Promise<any>;
  getNutritionDatabaseOverview(): Promise<any>;

  createInviteCode(data: InsertInviteCode): Promise<InviteCode>;
  getInviteCodeByCode(code: string): Promise<InviteCode | undefined>;
  getInviteCodesByCoach(coachId: string): Promise<InviteCode[]>;
  useInviteCode(code: string, clientId: string): Promise<InviteCode | undefined>;

  createCoachPlan(data: InsertCoachPlan): Promise<CoachPlan>;
  getCoachPlansByClient(clientId: string): Promise<CoachPlan[]>;
  getCoachPlansByCoach(coachId: string): Promise<CoachPlan[]>;
  getCoachPlan(id: string): Promise<CoachPlan | undefined>;
  deleteCoachPlan(id: string): Promise<void>;

  createMessage(data: InsertMessage): Promise<Message>;
  getMessages(userId1: string, userId2: string): Promise<Message[]>;
  getConversations(userId: string): Promise<{ partnerId: string; partnerName: string; lastMessage: string; lastMessageAt: string; unreadCount: number }[]>;
  markMessagesRead(senderId: string, receiverId: string): Promise<void>;

  getClientNutritionAnalytics(clientId: string, days: number): Promise<any>;
  getClientFitnessAnalytics(clientId: string, days: number): Promise<any>;

  createOnboardingProfile(data: InsertOnboardingProfile): Promise<OnboardingProfile>;
  getOnboardingProfile(userId: string): Promise<OnboardingProfile | undefined>;
  updateOnboardingProfile(id: string, data: Partial<InsertOnboardingProfile>): Promise<OnboardingProfile | undefined>;

  createGeneratedPlan(data: InsertGeneratedPlan): Promise<GeneratedPlan>;
  getLatestPlan(userId: string): Promise<GeneratedPlan | undefined>;
  getGeneratedPlan(id: string): Promise<GeneratedPlan | undefined>;
  updateGeneratedPlan(id: string, data: Partial<InsertGeneratedPlan>): Promise<GeneratedPlan | undefined>;
  getOrphanedGeneratingPlans(): Promise<GeneratedPlan[]>;

  // Conversation sessions
  createConversationSession(data: InsertConversationSession): Promise<ConversationSession>;
  getActiveSession(userId: string): Promise<ConversationSession | undefined>;
  updateConversationSession(id: string, data: Partial<InsertConversationSession>): Promise<ConversationSession | undefined>;

  // Conversation messages
  createConversationMessage(data: InsertConversationMessage): Promise<ConversationMessage>;
  getSessionMessages(sessionId: string): Promise<ConversationMessage[]>;

  // Activity logs
  createActivityLog(data: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(userId: string, activityType?: string): Promise<ActivityLog[]>;
  getRecentActivityLogs(userId: string, limit?: number): Promise<ActivityLog[]>;

  // Weekly meal presets
  getWeeklyMealPresets(userId: string, dayOfWeek?: number): Promise<WeeklyMealPreset[]>;
  createWeeklyMealPreset(data: InsertWeeklyMealPreset): Promise<WeeklyMealPreset>;
  deleteWeeklyMealPreset(id: string): Promise<void>;
  deleteAllWeeklyMealPresets(userId: string, dayOfWeek?: number): Promise<void>;

  // Nutrition insights
  getNutritionInsights(userId: string, dismissed?: boolean): Promise<NutritionInsight[]>;
  createNutritionInsight(data: InsertNutritionInsight): Promise<NutritionInsight>;
  dismissNutritionInsight(id: string): Promise<void>;

  // Progress photos
  getProgressPhotos(userId: string): Promise<ProgressPhoto[]>;
  createProgressPhoto(data: InsertProgressPhoto): Promise<ProgressPhoto>;
  deleteProgressPhoto(id: string): Promise<void>;
  getMealReminders(userId: string): Promise<MealReminder[]>;
  upsertMealReminder(data: InsertMealReminder): Promise<MealReminder>;
  deleteMealReminder(id: string): Promise<void>;

  // Weight logs
  getWeightLogs(userId: string, days?: number): Promise<WeightLog[]>;
  getLatestWeight(userId: string): Promise<WeightLog | undefined>;
  createWeightLog(data: InsertWeightLog): Promise<WeightLog>;
  deleteWeightLog(id: string, userId: string): Promise<void>;

  // Saved foods
  getSavedFoods(userId: string): Promise<SavedFood[]>;
  saveFood(data: InsertSavedFood): Promise<SavedFood>;
  unsaveFood(id: string, userId: string): Promise<void>;
  isFoodSaved(userId: string, name: string): Promise<SavedFood | undefined>;

  // Grocery items
  getGroceryItems(userId: string, planId?: string): Promise<GroceryItem[]>;
  createGroceryItem(data: InsertGroceryItem): Promise<GroceryItem>;
  toggleGroceryItem(id: string, userId: string, checked: boolean): Promise<GroceryItem | undefined>;
  deleteGroceryItem(id: string, userId: string): Promise<void>;
  seedGroceryFromPlan(userId: string, planId: string, items: { item: string; category: string }[]): Promise<"seeded" | "already_seeded" | "not_owned">;

  // Meal templates
  getMealTemplates(userId: string): Promise<any[]>;
  createMealTemplate(data: { userId: string; name: string; foods: any[]; totalCalories: number }): Promise<any>;
  deleteMealTemplate(id: string, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserBySupabaseId(supabaseId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.supabaseId, supabaseId));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getClientsByCoachId(coachId: string): Promise<User[]> {
    return db.select().from(users).where(and(eq(users.coachId, coachId), eq(users.role, "client")));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async getMealLogs(userId: string, date?: string): Promise<MealLog[]> {
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      return db.select().from(mealLogs)
        .where(and(eq(mealLogs.userId, userId), gte(mealLogs.loggedAt, start), lte(mealLogs.loggedAt, end)))
        .orderBy(desc(mealLogs.loggedAt));
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    return db.select().from(mealLogs)
      .where(and(eq(mealLogs.userId, userId), gte(mealLogs.loggedAt, today), lte(mealLogs.loggedAt, endOfDay)))
      .orderBy(desc(mealLogs.loggedAt));
  }

  async createMealLog(log: InsertMealLog): Promise<MealLog> {
    const [meal] = await db.insert(mealLogs).values(log).returning();
    return meal;
  }

  async updateMealLog(id: string, data: Partial<InsertMealLog>): Promise<MealLog | undefined> {
    const [updated] = await db.update(mealLogs).set(data).where(eq(mealLogs.id, id)).returning();
    return updated;
  }

  async deleteMealLog(id: string): Promise<void> {
    await db.delete(mealLogs).where(eq(mealLogs.id, id));
  }

  async getWaterLogs(userId: string, date?: string): Promise<WaterLog[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    return db.select().from(waterLogs)
      .where(and(eq(waterLogs.userId, userId), gte(waterLogs.loggedAt, today), lte(waterLogs.loggedAt, endOfDay)));
  }

  async deleteWaterLog(id: string, reduceAmount?: number): Promise<void> {
    if (reduceAmount !== undefined) {
      const [existing] = await db.select().from(waterLogs).where(eq(waterLogs.id, id));
      if (existing && existing.amount > reduceAmount) {
        await db.update(waterLogs).set({ amount: existing.amount - reduceAmount }).where(eq(waterLogs.id, id));
      } else {
        await db.delete(waterLogs).where(eq(waterLogs.id, id));
      }
    } else {
      await db.delete(waterLogs).where(eq(waterLogs.id, id));
    }
  }

  async createWaterLog(log: InsertWaterLog): Promise<WaterLog> {
    const [water] = await db.insert(waterLogs).values(log).returning();
    return water;
  }

  async getExercises(category?: string): Promise<Exercise[]> {
    if (category && category !== "All") {
      return db.select().from(exercises).where(eq(exercises.category, category));
    }
    return db.select().from(exercises);
  }

  async getExercise(id: string): Promise<Exercise | undefined> {
    const [exercise] = await db.select().from(exercises).where(eq(exercises.id, id));
    return exercise;
  }

  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    const [ex] = await db.insert(exercises).values(exercise).returning();
    return ex;
  }

  async getWorkoutPlans(category?: string): Promise<WorkoutPlan[]> {
    if (category && category !== "All") {
      return db.select().from(workoutPlans).where(eq(workoutPlans.category, category));
    }
    return db.select().from(workoutPlans);
  }

  async getWorkoutPlan(id: string): Promise<WorkoutPlan | undefined> {
    const [plan] = await db.select().from(workoutPlans).where(eq(workoutPlans.id, id));
    return plan;
  }

  async createWorkoutPlan(plan: InsertWorkoutPlan): Promise<WorkoutPlan> {
    const [wp] = await db.insert(workoutPlans).values(plan).returning();
    return wp;
  }

  async getWorkoutLogs(userId: string): Promise<WorkoutLog[]> {
    return db.select().from(workoutLogs)
      .where(eq(workoutLogs.userId, userId))
      .orderBy(desc(workoutLogs.loggedAt));
  }

  async createWorkoutLog(log: InsertWorkoutLog): Promise<WorkoutLog> {
    const [wl] = await db.insert(workoutLogs).values(log).returning();
    return wl;
  }

  async deleteWorkoutLog(id: string): Promise<void> {
    await db.delete(workoutLogs).where(eq(workoutLogs.id, id));
  }

  async getMealPlans(cuisine?: string, dietType?: string): Promise<MealPlan[]> {
    if (cuisine && cuisine !== "All") {
      return db.select().from(mealPlans).where(eq(mealPlans.cuisine, cuisine));
    }
    return db.select().from(mealPlans);
  }

  async getMealPlan(id: string): Promise<MealPlan | undefined> {
    const [plan] = await db.select().from(mealPlans).where(eq(mealPlans.id, id));
    return plan;
  }

  async createMealPlan(plan: InsertMealPlan): Promise<MealPlan> {
    const [mp] = await db.insert(mealPlans).values(plan).returning();
    return mp;
  }

  async getFitnessStats(filters?: { gender?: string; ageMin?: number; ageMax?: number; workoutType?: string; experienceLevel?: number }): Promise<any> {
    const conditions: any[] = [];
    if (filters?.gender) conditions.push(eq(fitnessData.gender, filters.gender));
    if (filters?.workoutType) conditions.push(eq(fitnessData.workoutType, filters.workoutType));
    if (filters?.experienceLevel) conditions.push(eq(fitnessData.experienceLevel, filters.experienceLevel));
    if (filters?.ageMin && filters?.ageMax) {
      conditions.push(gte(fitnessData.age, filters.ageMin));
      conditions.push(lte(fitnessData.age, filters.ageMax));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [stats] = await db.select({
      count: sql<number>`count(*)::int`,
      avgCalories: sql<number>`round(avg(${fitnessData.caloriesBurned})::numeric, 0)::int`,
      avgDuration: sql<number>`round(avg(${fitnessData.sessionDuration})::numeric, 2)`,
      avgBpm: sql<number>`round(avg(${fitnessData.avgBpm})::numeric, 0)::int`,
      avgMaxBpm: sql<number>`round(avg(${fitnessData.maxBpm})::numeric, 0)::int`,
      avgRestingBpm: sql<number>`round(avg(${fitnessData.restingBpm})::numeric, 0)::int`,
      avgBmi: sql<number>`round(avg(${fitnessData.bmi})::numeric, 1)`,
      avgFatPct: sql<number>`round(avg(${fitnessData.fatPercentage})::numeric, 1)`,
      avgWaterIntake: sql<number>`round(avg(${fitnessData.waterIntake})::numeric, 1)`,
      avgWorkoutFreq: sql<number>`round(avg(${fitnessData.workoutFrequency})::numeric, 1)`,
      minCalories: sql<number>`min(${fitnessData.caloriesBurned})::int`,
      maxCalories: sql<number>`max(${fitnessData.caloriesBurned})::int`,
    }).from(fitnessData).where(whereClause);

    return stats;
  }

  async getCaloriePrediction(params: { age: number; weight: number; height: number; gender: string; workoutType: string; duration: number }): Promise<any> {
    const ageRange = 5;
    const weightRange = 10;

    const conditions = [
      gte(fitnessData.age, params.age - ageRange),
      lte(fitnessData.age, params.age + ageRange),
      gte(fitnessData.weight, params.weight - weightRange),
      lte(fitnessData.weight, params.weight + weightRange),
      eq(fitnessData.gender, params.gender),
      eq(fitnessData.workoutType, params.workoutType),
    ];

    const [result] = await db.select({
      matchCount: sql<number>`count(*)::int`,
      avgCaloriesPerHour: sql<number>`round(avg(${fitnessData.caloriesBurned} / NULLIF(${fitnessData.sessionDuration}, 0))::numeric, 0)::int`,
      avgCalories: sql<number>`round(avg(${fitnessData.caloriesBurned})::numeric, 0)::int`,
      avgDuration: sql<number>`round(avg(${fitnessData.sessionDuration})::numeric, 2)`,
      avgMaxBpm: sql<number>`round(avg(${fitnessData.maxBpm})::numeric, 0)::int`,
      avgBpm: sql<number>`round(avg(${fitnessData.avgBpm})::numeric, 0)::int`,
      targetHrZone: sql<string>`round(avg(${fitnessData.avgBpm})::numeric, 0)::int || '-' || round(avg(${fitnessData.maxBpm})::numeric, 0)::int`,
    }).from(fitnessData).where(and(...conditions));

    const predictedCalories = result.avgCaloriesPerHour 
      ? Math.round(result.avgCaloriesPerHour * params.duration)
      : Math.round((result.avgCalories || 500) * (params.duration / (result.avgDuration || 1)));

    return {
      predictedCalories,
      avgCaloriesPerHour: result.avgCaloriesPerHour,
      targetHeartRate: result.avgBpm,
      maxHeartRate: result.avgMaxBpm,
      targetHrZone: result.targetHrZone,
      matchedProfiles: result.matchCount,
      confidence: result.matchCount > 10 ? "high" : result.matchCount > 3 ? "medium" : "low",
    };
  }

  async getAllStepsData(): Promise<any[]> {
    return db.select().from(stepsData).orderBy(stepsData.date);
  }

  async getStepsAnalysis(): Promise<any> {
    const [stats] = await db.select({
      totalRecords: sql<number>`count(*)::int`,
      totalSteps: sql<number>`sum(${stepsData.stepCount})::int`,
      totalCalories: sql<number>`sum(${stepsData.calories})::int`,
      totalDistanceKm: sql<number>`round(sum(${stepsData.distanceKm})::numeric, 1)`,
      avgSteps: sql<number>`round(avg(${stepsData.stepCount})::numeric, 0)::int`,
      avgCalories: sql<number>`round(avg(${stepsData.calories})::numeric, 0)::int`,
      avgDistanceKm: sql<number>`round(avg(${stepsData.distanceKm})::numeric, 2)`,
      avgActiveMinutes: sql<number>`round(avg(${stepsData.activeMinutes})::numeric, 0)::int`,
      maxSteps: sql<number>`max(${stepsData.stepCount})`,
      minSteps: sql<number>`min(${stepsData.stepCount})`,
      maxCalories: sql<number>`max(${stepsData.calories})`,
      avgGoalPct: sql<number>`round(avg(${stepsData.goalPercentage})::numeric, 0)::int`,
      daysGoalMet: sql<number>`count(case when ${stepsData.goalPercentage} >= 100 then 1 end)::int`,
      avgFlights: sql<number>`round(avg(${stepsData.flightsClimbed})::numeric, 1)`,
    }).from(stepsData);

    return stats;
  }

  async getStepsCorrelation(): Promise<any> {
    const allData = await db.select({
      stepCount: stepsData.stepCount,
      calories: stepsData.calories,
      distanceKm: stepsData.distanceKm,
      activeMinutes: stepsData.activeMinutes,
      flightsClimbed: stepsData.flightsClimbed,
      goalPercentage: stepsData.goalPercentage,
    }).from(stepsData);

    const n = allData.length;
    const steps = allData.map(d => d.stepCount);
    const cals = allData.map(d => d.calories);
    const mins = allData.map(d => d.activeMinutes);

    const pearson = (x: number[], y: number[]) => {
      const meanX = x.reduce((a, b) => a + b, 0) / n;
      const meanY = y.reduce((a, b) => a + b, 0) / n;
      let num = 0, denX = 0, denY = 0;
      for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
      }
      return denX === 0 || denY === 0 ? 0 : Math.round((num / Math.sqrt(denX * denY)) * 1000) / 1000;
    };

    const meanSteps = steps.reduce((a, b) => a + b, 0) / n;
    const meanCals = cals.reduce((a, b) => a + b, 0) / n;
    let sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      const dx = steps[i] - meanSteps;
      sumXY += dx * (cals[i] - meanCals);
      sumXX += dx * dx;
    }
    const slope = sumXX === 0 ? 0 : sumXY / sumXX;
    const intercept = meanCals - slope * meanSteps;

    return {
      stepsToCalories: pearson(steps, cals),
      stepsToActiveMinutes: pearson(steps, mins),
      caloriesToActiveMinutes: pearson(cals, mins),
      linearRegression: {
        slope: Math.round(slope * 10000) / 10000,
        intercept: Math.round(intercept * 100) / 100,
        equation: `calories = ${Math.round(slope * 10000) / 10000} × steps + ${Math.round(intercept * 100) / 100}`,
        predictCalories: (targetSteps: number) => Math.round(slope * targetSteps + intercept),
      },
      caloriesPerStep: Math.round(meanCals / meanSteps * 1000) / 1000,
      caloriesPer1000Steps: Math.round((meanCals / meanSteps) * 1000),
    };
  }

  async getStepsTrends(): Promise<any> {
    const monthlyTrends = await db.select({
      month: sql<string>`to_char(to_date(${stepsData.date}, 'MM/DD/YYYY'), 'YYYY-MM')`,
      avgSteps: sql<number>`round(avg(${stepsData.stepCount})::numeric, 0)::int`,
      avgCalories: sql<number>`round(avg(${stepsData.calories})::numeric, 0)::int`,
      totalSteps: sql<number>`sum(${stepsData.stepCount})::int`,
      totalCalories: sql<number>`sum(${stepsData.calories})::int`,
      avgGoalPct: sql<number>`round(avg(${stepsData.goalPercentage})::numeric, 0)::int`,
      daysTracked: sql<number>`count(*)::int`,
      bestDay: sql<number>`max(${stepsData.stepCount})`,
      daysGoalMet: sql<number>`count(case when ${stepsData.goalPercentage} >= 100 then 1 end)::int`,
    }).from(stepsData)
      .groupBy(sql`to_char(to_date(${stepsData.date}, 'MM/DD/YYYY'), 'YYYY-MM')`)
      .orderBy(sql`to_char(to_date(${stepsData.date}, 'MM/DD/YYYY'), 'YYYY-MM')`);

    const weekdayAnalysis = await db.select({
      dayOfWeek: sql<number>`extract(dow from to_date(${stepsData.date}, 'MM/DD/YYYY'))::int`,
      avgSteps: sql<number>`round(avg(${stepsData.stepCount})::numeric, 0)::int`,
      avgCalories: sql<number>`round(avg(${stepsData.calories})::numeric, 0)::int`,
    }).from(stepsData)
      .groupBy(sql`extract(dow from to_date(${stepsData.date}, 'MM/DD/YYYY'))`)
      .orderBy(sql`extract(dow from to_date(${stepsData.date}, 'MM/DD/YYYY'))`);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekdayData = weekdayAnalysis.map(w => ({
      ...w,
      dayName: dayNames[w.dayOfWeek] || "?",
    }));

    const firstMonth = monthlyTrends[0];
    const lastMonth = monthlyTrends[monthlyTrends.length - 1];
    const improvement = firstMonth && lastMonth
      ? Math.round(((lastMonth.avgSteps - firstMonth.avgSteps) / firstMonth.avgSteps) * 100)
      : 0;

    return {
      monthly: monthlyTrends,
      weekday: weekdayData,
      overallTrend: improvement > 0 ? "improving" : improvement < 0 ? "declining" : "stable",
      improvementPercent: improvement,
    };
  }

  async getStepsGoalAnalysis(): Promise<any> {
    const [goalStats] = await db.select({
      totalDays: sql<number>`count(*)::int`,
      daysGoalMet: sql<number>`count(case when ${stepsData.goalPercentage} >= 100 then 1 end)::int`,
      daysOver75: sql<number>`count(case when ${stepsData.goalPercentage} >= 75 then 1 end)::int`,
      daysOver50: sql<number>`count(case when ${stepsData.goalPercentage} >= 50 then 1 end)::int`,
      daysUnder25: sql<number>`count(case when ${stepsData.goalPercentage} < 25 then 1 end)::int`,
      avgGoalPct: sql<number>`round(avg(${stepsData.goalPercentage})::numeric, 0)::int`,
      avgStepsOnGoalDays: sql<number>`round(avg(case when ${stepsData.goalPercentage} >= 100 then ${stepsData.stepCount} end)::numeric, 0)::int`,
      avgCaloriesOnGoalDays: sql<number>`round(avg(case when ${stepsData.goalPercentage} >= 100 then ${stepsData.calories} end)::numeric, 0)::int`,
      avgStepsOnNonGoalDays: sql<number>`round(avg(case when ${stepsData.goalPercentage} < 100 then ${stepsData.stepCount} end)::numeric, 0)::int`,
      avgCaloriesOnNonGoalDays: sql<number>`round(avg(case when ${stepsData.goalPercentage} < 100 then ${stepsData.calories} end)::numeric, 0)::int`,
    }).from(stepsData);

    const goalRate = goalStats.totalDays > 0 
      ? Math.round((goalStats.daysGoalMet / goalStats.totalDays) * 100) 
      : 0;

    const caloriesDifference = (goalStats.avgCaloriesOnGoalDays || 0) - (goalStats.avgCaloriesOnNonGoalDays || 0);

    return {
      ...goalStats,
      goalCompletionRate: goalRate,
      extraCaloriesOnGoalDays: caloriesDifference,
      weightLossImpact: {
        dailyCalorieDifference: caloriesDifference,
        weeklyExtraCalories: caloriesDifference * 7,
        monthlyExtraCalories: caloriesDifference * 30,
        potentialWeightLossPerMonthKg: Math.round((caloriesDifference * 30 / 7700) * 10) / 10,
      },
    };
  }

  async getPersonalizedInsights(userAge: number, userWeight: number, userGender: string): Promise<any> {
    const ageRange = 5;

    const similarPeople = and(
      gte(fitnessData.age, userAge - ageRange),
      lte(fitnessData.age, userAge + ageRange),
      eq(fitnessData.gender, userGender),
    );

    const [overallStats] = await db.select({
      avgCalories: sql<number>`round(avg(${fitnessData.caloriesBurned})::numeric, 0)::int`,
      avgDuration: sql<number>`round(avg(${fitnessData.sessionDuration})::numeric, 2)`,
      avgFrequency: sql<number>`round(avg(${fitnessData.workoutFrequency})::numeric, 1)`,
      avgWater: sql<number>`round(avg(${fitnessData.waterIntake})::numeric, 1)`,
      avgBmi: sql<number>`round(avg(${fitnessData.bmi})::numeric, 1)`,
      avgFat: sql<number>`round(avg(${fitnessData.fatPercentage})::numeric, 1)`,
      avgRestingBpm: sql<number>`round(avg(${fitnessData.restingBpm})::numeric, 0)::int`,
    }).from(fitnessData).where(similarPeople);

    const workoutBreakdown = await db.select({
      workoutType: fitnessData.workoutType,
      avgCalories: sql<number>`round(avg(${fitnessData.caloriesBurned})::numeric, 0)::int`,
      avgDuration: sql<number>`round(avg(${fitnessData.sessionDuration})::numeric, 2)`,
      avgMaxBpm: sql<number>`round(avg(${fitnessData.maxBpm})::numeric, 0)::int`,
      count: sql<number>`count(*)::int`,
    }).from(fitnessData).where(similarPeople).groupBy(fitnessData.workoutType);

    const experienceBreakdown = await db.select({
      experienceLevel: fitnessData.experienceLevel,
      avgCalories: sql<number>`round(avg(${fitnessData.caloriesBurned})::numeric, 0)::int`,
      avgFrequency: sql<number>`round(avg(${fitnessData.workoutFrequency})::numeric, 1)`,
      avgFat: sql<number>`round(avg(${fitnessData.fatPercentage})::numeric, 1)`,
      count: sql<number>`count(*)::int`,
    }).from(fitnessData).where(similarPeople).groupBy(fitnessData.experienceLevel);

    const userBmi = userWeight / (1.7 * 1.7);

    const bestWorkout = workoutBreakdown.sort((a, b) => b.avgCalories - a.avgCalories)[0];

    return {
      peerStats: overallStats,
      workoutBreakdown,
      experienceBreakdown,
      recommendations: {
        bestCalorieBurner: bestWorkout?.workoutType || "Cardio",
        bestCalorieBurnerAvg: bestWorkout?.avgCalories || 0,
        recommendedWaterIntake: overallStats.avgWater,
        recommendedFrequency: overallStats.avgFrequency,
        targetRestingBpm: overallStats.avgRestingBpm,
      },
      userBmi: Math.round(userBmi * 10) / 10,
      peerAvgBmi: overallStats.avgBmi,
    };
  }
  async getWeeklyMealHistory(userId: string): Promise<any[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const results = await db.select({
      date: sql<string>`DATE(${mealLogs.loggedAt})::text`,
      totalCalories: sql<number>`COALESCE(SUM(${mealLogs.calories}), 0)::int`,
      totalProtein: sql<number>`ROUND(COALESCE(SUM(${mealLogs.protein}), 0)::numeric, 1)`,
      totalCarbs: sql<number>`ROUND(COALESCE(SUM(${mealLogs.carbs}), 0)::numeric, 1)`,
      totalFat: sql<number>`ROUND(COALESCE(SUM(${mealLogs.fat}), 0)::numeric, 1)`,
      totalFiber: sql<number>`ROUND(COALESCE(SUM(${mealLogs.fiber}), 0)::numeric, 1)`,
      totalSugar: sql<number>`ROUND(COALESCE(SUM(${mealLogs.sugar}), 0)::numeric, 1)`,
      totalSodium: sql<number>`ROUND(COALESCE(SUM(${mealLogs.sodium}), 0)::numeric, 1)`,
      mealCount: sql<number>`COUNT(*)::int`,
    })
      .from(mealLogs)
      .where(and(eq(mealLogs.userId, userId), gte(mealLogs.loggedAt, sevenDaysAgo)))
      .groupBy(sql`DATE(${mealLogs.loggedAt})`)
      .orderBy(sql`DATE(${mealLogs.loggedAt})`);

    return results;
  }

  async getMealHistory(userId: string, startDate: string, endDate: string): Promise<MealLog[]> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return db.select().from(mealLogs)
      .where(and(eq(mealLogs.userId, userId), gte(mealLogs.loggedAt, start), lte(mealLogs.loggedAt, end)))
      .orderBy(desc(mealLogs.loggedAt));
  }

  async searchFoodNutrition(query: string, limit: number = 20): Promise<FoodNutrition[]> {
    return db.select().from(foodNutrition)
      .where(ilike(foodNutrition.food, `%${query}%`))
      .limit(limit);
  }

  async getFoodNutritionStats(): Promise<any> {
    const [stats] = await db.select({
      totalFoods: sql<number>`count(*)::int`,
      avgCalories: sql<number>`round(avg(${foodNutrition.caloricValue})::numeric, 1)`,
      avgProtein: sql<number>`round(avg(${foodNutrition.protein})::numeric, 1)`,
      avgCarbs: sql<number>`round(avg(${foodNutrition.carbohydrates})::numeric, 1)`,
      avgFat: sql<number>`round(avg(${foodNutrition.fat})::numeric, 1)`,
      avgFiber: sql<number>`round(avg(${foodNutrition.dietaryFiber})::numeric, 1)`,
      avgNutritionDensity: sql<number>`round(avg(${foodNutrition.nutritionDensity})::numeric, 1)`,
      maxCalories: sql<number>`max(${foodNutrition.caloricValue})`,
      minCalories: sql<number>`min(${foodNutrition.caloricValue})`,
      highProteinCount: sql<number>`count(case when ${foodNutrition.protein} > 20 then 1 end)::int`,
      lowCalCount: sql<number>`count(case when ${foodNutrition.caloricValue} < 100 then 1 end)::int`,
      highFiberCount: sql<number>`count(case when ${foodNutrition.dietaryFiber} > 5 then 1 end)::int`,
    }).from(foodNutrition);

    const topProtein = await db.select({ food: foodNutrition.food, protein: foodNutrition.protein, calories: foodNutrition.caloricValue })
      .from(foodNutrition).orderBy(desc(foodNutrition.protein)).limit(5);

    const topNutrientDense = await db.select({ food: foodNutrition.food, nutritionDensity: foodNutrition.nutritionDensity, calories: foodNutrition.caloricValue })
      .from(foodNutrition).orderBy(desc(foodNutrition.nutritionDensity)).limit(5);

    const lowestCalorie = await db.select({ food: foodNutrition.food, calories: foodNutrition.caloricValue, protein: foodNutrition.protein })
      .from(foodNutrition).where(gte(foodNutrition.caloricValue, 1)).orderBy(asc(foodNutrition.caloricValue)).limit(5);

    return { ...stats, topProtein, topNutrientDense, lowestCalorie };
  }

  async findSimilarFoods(foodName: string, limit: number = 10): Promise<any> {
    const [targetFood] = await db.select().from(foodNutrition)
      .where(ilike(foodNutrition.food, `%${foodName}%`)).limit(1);

    if (!targetFood) return { target: null, similar: [], message: "Food not found" };

    const calRange = targetFood.caloricValue * 0.3;
    const protRange = targetFood.protein * 0.5;

    const similar = await db.select().from(foodNutrition)
      .where(and(
        gte(foodNutrition.caloricValue, targetFood.caloricValue - calRange),
        lte(foodNutrition.caloricValue, targetFood.caloricValue + calRange),
        gte(foodNutrition.protein, targetFood.protein - protRange),
        lte(foodNutrition.protein, targetFood.protein + protRange),
        sql`${foodNutrition.id} != ${targetFood.id}`
      ))
      .limit(limit);

    return {
      target: targetFood,
      similar: similar.map(s => ({
        ...s,
        calorieDiff: Math.round(s.caloricValue - targetFood.caloricValue),
        proteinDiff: Math.round((s.protein - targetFood.protein) * 10) / 10,
        densityDiff: Math.round((s.nutritionDensity - targetFood.nutritionDensity) * 10) / 10,
      })),
    };
  }

  async getFoodHealthScore(foodName: string): Promise<any> {
    const [food] = await db.select().from(foodNutrition)
      .where(ilike(foodNutrition.food, `%${foodName}%`)).limit(1);

    if (!food) return { food: null, score: 0, message: "Food not found" };

    const [avgAll] = await db.select({
      avgCal: sql<number>`avg(${foodNutrition.caloricValue})`,
      avgProtein: sql<number>`avg(${foodNutrition.protein})`,
      avgFiber: sql<number>`avg(${foodNutrition.dietaryFiber})`,
      avgSodium: sql<number>`avg(${foodNutrition.sodium})`,
      avgSugar: sql<number>`avg(${foodNutrition.sugars})`,
      avgSatFat: sql<number>`avg(${foodNutrition.saturatedFats})`,
      avgDensity: sql<number>`avg(${foodNutrition.nutritionDensity})`,
    }).from(foodNutrition);

    let score = 50;
    if (food.protein > avgAll.avgProtein) score += 10;
    if (food.dietaryFiber > avgAll.avgFiber) score += 10;
    if (food.caloricValue < avgAll.avgCal) score += 5;
    if (food.saturatedFats < avgAll.avgSatFat) score += 5;
    if (food.sugars < avgAll.avgSugar) score += 5;
    if (food.sodium < avgAll.avgSodium) score += 5;
    if (food.nutritionDensity > avgAll.avgDensity) score += 10;

    if (food.vitaminC > 0) score += 2;
    if (food.vitaminA > 0) score += 2;
    if (food.iron > 0) score += 2;
    if (food.calcium > 0) score += 2;
    if (food.potassium > 0) score += 2;

    score = Math.min(100, Math.max(0, score));

    const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "F";

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    if (food.protein > avgAll.avgProtein) strengths.push("High protein");
    if (food.dietaryFiber > avgAll.avgFiber) strengths.push("High fiber");
    if (food.vitaminC > 1) strengths.push("Good Vitamin C");
    if (food.iron > 1) strengths.push("Good iron content");
    if (food.calcium > 50) strengths.push("Good calcium");
    if (food.saturatedFats > avgAll.avgSatFat * 1.5) weaknesses.push("High saturated fat");
    if (food.sugars > avgAll.avgSugar * 1.5) weaknesses.push("High sugar");
    if (food.sodium > avgAll.avgSodium * 1.5) weaknesses.push("High sodium");
    if (food.cholesterol > 100) weaknesses.push("High cholesterol");

    return {
      food: food.food,
      score,
      grade,
      strengths,
      weaknesses,
      macros: {
        calories: food.caloricValue,
        protein: food.protein,
        carbs: food.carbohydrates,
        fat: food.fat,
        fiber: food.dietaryFiber,
      },
      vitamins: {
        A: food.vitaminA, B1: food.vitaminB1, B2: food.vitaminB2, B3: food.vitaminB3,
        B5: food.vitaminB5, B6: food.vitaminB6, B12: food.vitaminB12,
        C: food.vitaminC, D: food.vitaminD, E: food.vitaminE, K: food.vitaminK,
        folicAcid: food.vitaminB11,
      },
      minerals: {
        calcium: food.calcium, iron: food.iron, magnesium: food.magnesium,
        phosphorus: food.phosphorus, potassium: food.potassium, zinc: food.zinc,
        copper: food.copper, manganese: food.manganese, selenium: food.selenium,
      },
      nutritionDensity: food.nutritionDensity,
    };
  }

  async getNutrientGapAnalysis(userId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayMeals = await db.select().from(mealLogs)
      .where(and(eq(mealLogs.userId, userId), gte(mealLogs.loggedAt, today), lte(mealLogs.loggedAt, endOfDay)));

    const totalCalories = todayMeals.reduce((sum, m) => sum + m.calories, 0);
    const totalProtein = todayMeals.reduce((sum, m) => sum + m.protein, 0);
    const totalCarbs = todayMeals.reduce((sum, m) => sum + m.carbs, 0);
    const totalFat = todayMeals.reduce((sum, m) => sum + m.fat, 0);

    const user = await this.getUser(userId);
    const targets = {
      calories: user?.dailyCalorieTarget || 2400,
      protein: user?.proteinTarget || 160,
      carbs: user?.carbsTarget || 220,
      fat: user?.fatTarget || 70,
    };

    const gaps = {
      calories: { consumed: totalCalories, target: targets.calories, remaining: targets.calories - totalCalories, pct: Math.round((totalCalories / targets.calories) * 100) },
      protein: { consumed: Math.round(totalProtein), target: targets.protein, remaining: Math.round(targets.protein - totalProtein), pct: Math.round((totalProtein / targets.protein) * 100) },
      carbs: { consumed: Math.round(totalCarbs), target: targets.carbs, remaining: Math.round(targets.carbs - totalCarbs), pct: Math.round((totalCarbs / targets.carbs) * 100) },
      fat: { consumed: Math.round(totalFat), target: targets.fat, remaining: Math.round(targets.fat - totalFat), pct: Math.round((totalFat / targets.fat) * 100) },
    };

    const suggestions: any[] = [];
    if (gaps.protein.remaining > 20) {
      const highProtein = await db.select({ food: foodNutrition.food, protein: foodNutrition.protein, calories: foodNutrition.caloricValue })
        .from(foodNutrition).orderBy(desc(foodNutrition.protein)).limit(5);
      suggestions.push({ nutrient: "protein", deficit: gaps.protein.remaining, suggestedFoods: highProtein });
    }
    if (gaps.calories.remaining > 300) {
      const balanced = await db.select({ food: foodNutrition.food, calories: foodNutrition.caloricValue, protein: foodNutrition.protein, nutritionDensity: foodNutrition.nutritionDensity })
        .from(foodNutrition)
        .where(and(gte(foodNutrition.caloricValue, 100), lte(foodNutrition.caloricValue, 400)))
        .orderBy(desc(foodNutrition.nutritionDensity)).limit(5);
      suggestions.push({ nutrient: "calories", deficit: gaps.calories.remaining, suggestedFoods: balanced });
    }

    return { mealsToday: todayMeals.length, gaps, suggestions };
  }

  async searchOpenFoodFacts(query: string, limit: number = 20): Promise<OpenFoodFact[]> {
    return db.select().from(openFoodFacts)
      .where(or(
        ilike(openFoodFacts.productName, `%${query}%`),
        ilike(openFoodFacts.brands, `%${query}%`),
        ilike(openFoodFacts.categoriesEn, `%${query}%`)
      ))
      .limit(limit);
  }

  async getOpenFoodFactsGrades(): Promise<any> {
    const gradeDistribution = await db.select({
      grade: openFoodFacts.nutritionGrade,
      count: sql<number>`count(*)::int`,
      avgEnergy: sql<number>`round(avg(${openFoodFacts.energy100g})::numeric, 0)::int`,
      avgFat: sql<number>`round(avg(${openFoodFacts.fat100g})::numeric, 1)`,
      avgSugar: sql<number>`round(avg(${openFoodFacts.sugars100g})::numeric, 1)`,
      avgProtein: sql<number>`round(avg(${openFoodFacts.proteins100g})::numeric, 1)`,
      avgFiber: sql<number>`round(avg(${openFoodFacts.fiber100g})::numeric, 1)`,
    }).from(openFoodFacts)
      .where(sql`${openFoodFacts.nutritionGrade} IS NOT NULL AND ${openFoodFacts.nutritionGrade} != ''`)
      .groupBy(openFoodFacts.nutritionGrade)
      .orderBy(openFoodFacts.nutritionGrade);

    return { grades: gradeDistribution };
  }

  async getNutritionDatabaseOverview(): Promise<any> {
    const [foodStats] = await db.select({
      totalFoods: sql<number>`count(*)::int`,
      avgCalories: sql<number>`round(avg(${foodNutrition.caloricValue})::numeric, 1)`,
      avgNutrientDensity: sql<number>`round(avg(${foodNutrition.nutritionDensity})::numeric, 1)`,
    }).from(foodNutrition);

    const [productStats] = await db.select({
      totalProducts: sql<number>`count(*)::int`,
      withGrade: sql<number>`count(case when ${openFoodFacts.nutritionGrade} is not null and ${openFoodFacts.nutritionGrade} != '' then 1 end)::int`,
      avgEnergy: sql<number>`round(avg(${openFoodFacts.energy100g})::numeric, 0)::int`,
      uniqueBrands: sql<number>`count(distinct ${openFoodFacts.brands})::int`,
    }).from(openFoodFacts);

    const topCategories = await db.select({
      category: openFoodFacts.mainCategory,
      count: sql<number>`count(*)::int`,
    }).from(openFoodFacts)
      .where(sql`${openFoodFacts.mainCategory} IS NOT NULL AND ${openFoodFacts.mainCategory} != ''`)
      .groupBy(openFoodFacts.mainCategory)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    return {
      foodNutritionDb: { ...foodStats, description: "Detailed nutritional profiles with 35 nutrients per food" },
      openFoodFactsDb: { ...productStats, description: "Real-world product database with brands and Nutri-Score" },
      topCategories,
      totalDataPoints: (foodStats.totalFoods || 0) + (productStats.totalProducts || 0),
    };
  }

  async createInviteCode(data: InsertInviteCode): Promise<InviteCode> {
    const [code] = await db.insert(inviteCodes).values(data).returning();
    return code;
  }

  async getInviteCodeByCode(code: string): Promise<InviteCode | undefined> {
    const [result] = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code));
    return result;
  }

  async getInviteCodesByCoach(coachId: string): Promise<InviteCode[]> {
    return db.select().from(inviteCodes).where(eq(inviteCodes.coachId, coachId)).orderBy(desc(inviteCodes.createdAt));
  }

  async useInviteCode(code: string, clientId: string): Promise<InviteCode | undefined> {
    const [updated] = await db.update(inviteCodes)
      .set({ usedBy: clientId, usedAt: new Date() })
      .where(and(eq(inviteCodes.code, code), sql`${inviteCodes.usedBy} IS NULL`))
      .returning();
    return updated;
  }

  async createCoachPlan(data: InsertCoachPlan): Promise<CoachPlan> {
    const [plan] = await db.insert(coachPlans).values(data).returning();
    return plan;
  }

  async getCoachPlansByClient(clientId: string): Promise<CoachPlan[]> {
    return db.select().from(coachPlans).where(eq(coachPlans.clientId, clientId)).orderBy(desc(coachPlans.createdAt));
  }

  async getCoachPlansByCoach(coachId: string): Promise<CoachPlan[]> {
    return db.select().from(coachPlans).where(eq(coachPlans.coachId, coachId)).orderBy(desc(coachPlans.createdAt));
  }

  async getCoachPlan(id: string): Promise<CoachPlan | undefined> {
    const [plan] = await db.select().from(coachPlans).where(eq(coachPlans.id, id));
    return plan;
  }

  async deleteCoachPlan(id: string): Promise<void> {
    await db.delete(coachPlans).where(eq(coachPlans.id, id));
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(data).returning();
    return msg;
  }

  async getMessages(userId1: string, userId2: string): Promise<Message[]> {
    return db.select().from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
        )
      )
      .orderBy(asc(messages.createdAt));
  }

  async getConversations(userId: string): Promise<{ partnerId: string; partnerName: string; lastMessage: string; lastMessageAt: string; unreadCount: number }[]> {
    const allMessages = await db.select().from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(desc(messages.createdAt));

    const convMap = new Map<string, { partnerId: string; lastMessage: string; lastMessageAt: string; unreadCount: number }>();
    for (const msg of allMessages) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, {
          partnerId,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt?.toISOString() || '',
          unreadCount: 0,
        });
      }
      if (msg.receiverId === userId && !msg.read) {
        const conv = convMap.get(partnerId)!;
        conv.unreadCount++;
      }
    }

    const results: { partnerId: string; partnerName: string; lastMessage: string; lastMessageAt: string; unreadCount: number }[] = [];
    for (const conv of convMap.values()) {
      const partner = await this.getUser(conv.partnerId);
      results.push({
        ...conv,
        partnerName: partner?.name || partner?.firstName || partner?.username || 'User',
      });
    }
    return results;
  }

  async markMessagesRead(senderId: string, receiverId: string): Promise<void> {
    await db.update(messages)
      .set({ read: true })
      .where(and(eq(messages.senderId, senderId), eq(messages.receiverId, receiverId)));
  }

  async getClientNutritionAnalytics(clientId: string, days: number): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const dailyBreakdown = await db.select({
      date: sql<string>`DATE(${mealLogs.loggedAt})::text`,
      calories: sql<number>`COALESCE(SUM(${mealLogs.calories}), 0)::int`,
      protein: sql<number>`ROUND(COALESCE(SUM(${mealLogs.protein}), 0)::numeric, 1)`,
      carbs: sql<number>`ROUND(COALESCE(SUM(${mealLogs.carbs}), 0)::numeric, 1)`,
      fat: sql<number>`ROUND(COALESCE(SUM(${mealLogs.fat}), 0)::numeric, 1)`,
      mealCount: sql<number>`COUNT(*)::int`,
    })
      .from(mealLogs)
      .where(and(eq(mealLogs.userId, clientId), gte(mealLogs.loggedAt, startDate)))
      .groupBy(sql`DATE(${mealLogs.loggedAt})`)
      .orderBy(sql`DATE(${mealLogs.loggedAt})`);

    const recentMeals = await db.select()
      .from(mealLogs)
      .where(eq(mealLogs.userId, clientId))
      .orderBy(desc(mealLogs.loggedAt))
      .limit(10);

    return { dailyBreakdown, recentMeals };
  }

  async getClientFitnessAnalytics(clientId: string, days: number): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const dailyBreakdown = await db.select({
      date: sql<string>`DATE(${workoutLogs.loggedAt})::text`,
      caloriesBurned: sql<number>`COALESCE(SUM(${workoutLogs.caloriesBurned}), 0)::int`,
      workoutCount: sql<number>`COUNT(*)::int`,
    })
      .from(workoutLogs)
      .where(and(eq(workoutLogs.userId, clientId), gte(workoutLogs.loggedAt, startDate)))
      .groupBy(sql`DATE(${workoutLogs.loggedAt})`)
      .orderBy(sql`DATE(${workoutLogs.loggedAt})`);

    const recentWorkouts = await db.select()
      .from(workoutLogs)
      .where(eq(workoutLogs.userId, clientId))
      .orderBy(desc(workoutLogs.loggedAt))
      .limit(10);

    return { dailyBreakdown, recentWorkouts };
  }
  async createOnboardingProfile(data: InsertOnboardingProfile): Promise<OnboardingProfile> {
    const [profile] = await db.insert(onboardingProfiles).values(data).returning();
    return profile;
  }

  async getOnboardingProfile(userId: string): Promise<OnboardingProfile | undefined> {
    const [profile] = await db.select().from(onboardingProfiles).where(eq(onboardingProfiles.userId, userId)).orderBy(desc(onboardingProfiles.createdAt)).limit(1);
    return profile;
  }

  async updateOnboardingProfile(id: string, data: Partial<InsertOnboardingProfile>): Promise<OnboardingProfile | undefined> {
    const [updated] = await db.update(onboardingProfiles).set({ ...data, updatedAt: new Date() }).where(eq(onboardingProfiles.id, id)).returning();
    return updated;
  }

  async createGeneratedPlan(data: InsertGeneratedPlan): Promise<GeneratedPlan> {
    const [plan] = await db.insert(generatedPlans).values(data).returning();
    return plan;
  }

  async getLatestPlan(userId: string): Promise<GeneratedPlan | undefined> {
    const [plan] = await db.select().from(generatedPlans).where(eq(generatedPlans.userId, userId)).orderBy(desc(generatedPlans.createdAt)).limit(1);
    return plan;
  }

  async getGeneratedPlan(id: string): Promise<GeneratedPlan | undefined> {
    const [plan] = await db.select().from(generatedPlans).where(eq(generatedPlans.id, id));
    return plan;
  }

  async updateGeneratedPlan(id: string, data: Partial<InsertGeneratedPlan>): Promise<GeneratedPlan | undefined> {
    const [updated] = await db.update(generatedPlans).set({ ...data, updatedAt: new Date() }).where(eq(generatedPlans.id, id)).returning();
    return updated;
  }

  async getOrphanedGeneratingPlans(): Promise<GeneratedPlan[]> {
    return db.select().from(generatedPlans).where(eq(generatedPlans.status, "generating"));
  }

  async createConversationSession(data: InsertConversationSession): Promise<ConversationSession> {
    const [session] = await db.insert(conversationSessions).values(data).returning();
    return session;
  }

  async getActiveSession(userId: string): Promise<ConversationSession | undefined> {
    const [session] = await db.select().from(conversationSessions)
      .where(and(eq(conversationSessions.userId, userId), eq(conversationSessions.status, "active")))
      .orderBy(desc(conversationSessions.createdAt))
      .limit(1);
    return session;
  }

  async updateConversationSession(id: string, data: Partial<InsertConversationSession>): Promise<ConversationSession | undefined> {
    const [updated] = await db.update(conversationSessions).set({ ...data, updatedAt: new Date() }).where(eq(conversationSessions.id, id)).returning();
    return updated;
  }

  async createConversationMessage(data: InsertConversationMessage): Promise<ConversationMessage> {
    const [message] = await db.insert(conversationMessages).values(data).returning();
    return message;
  }

  async getSessionMessages(sessionId: string): Promise<ConversationMessage[]> {
    return db.select().from(conversationMessages)
      .where(eq(conversationMessages.sessionId, sessionId))
      .orderBy(asc(conversationMessages.createdAt));
  }

  async createActivityLog(data: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db.insert(activityLogs).values(data).returning();
    return log;
  }

  async getActivityLogs(userId: string, activityType?: string): Promise<ActivityLog[]> {
    if (activityType) {
      return db.select().from(activityLogs)
        .where(and(eq(activityLogs.userId, userId), eq(activityLogs.activityType, activityType)))
        .orderBy(desc(activityLogs.createdAt));
    }
    return db.select().from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt));
  }

  async getRecentActivityLogs(userId: string, limit: number = 10): Promise<ActivityLog[]> {
    return db.select().from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async getWeeklyMealPresets(userId: string, dayOfWeek?: number): Promise<WeeklyMealPreset[]> {
    if (dayOfWeek !== undefined) {
      return db.select().from(weeklyMealPresets)
        .where(and(eq(weeklyMealPresets.userId, userId), eq(weeklyMealPresets.dayOfWeek, dayOfWeek)))
        .orderBy(asc(weeklyMealPresets.mealType));
    }
    return db.select().from(weeklyMealPresets)
      .where(eq(weeklyMealPresets.userId, userId))
      .orderBy(asc(weeklyMealPresets.dayOfWeek), asc(weeklyMealPresets.mealType));
  }

  async createWeeklyMealPreset(data: InsertWeeklyMealPreset): Promise<WeeklyMealPreset> {
    const [preset] = await db.insert(weeklyMealPresets).values(data).returning();
    return preset;
  }

  async deleteWeeklyMealPreset(id: string): Promise<void> {
    await db.delete(weeklyMealPresets).where(eq(weeklyMealPresets.id, id));
  }

  async deleteAllWeeklyMealPresets(userId: string, dayOfWeek?: number): Promise<void> {
    if (dayOfWeek !== undefined) {
      await db.delete(weeklyMealPresets).where(and(eq(weeklyMealPresets.userId, userId), eq(weeklyMealPresets.dayOfWeek, dayOfWeek)));
    } else {
      await db.delete(weeklyMealPresets).where(eq(weeklyMealPresets.userId, userId));
    }
  }

  async getNutritionInsights(userId: string, dismissed?: boolean): Promise<NutritionInsight[]> {
    if (dismissed !== undefined) {
      return db.select().from(nutritionInsights)
        .where(and(eq(nutritionInsights.userId, userId), eq(nutritionInsights.dismissed, dismissed)))
        .orderBy(desc(nutritionInsights.createdAt));
    }
    return db.select().from(nutritionInsights)
      .where(eq(nutritionInsights.userId, userId))
      .orderBy(desc(nutritionInsights.createdAt));
  }

  async createNutritionInsight(data: InsertNutritionInsight): Promise<NutritionInsight> {
    const [insight] = await db.insert(nutritionInsights).values(data).returning();
    return insight;
  }

  async dismissNutritionInsight(id: string): Promise<void> {
    await db.update(nutritionInsights).set({ dismissed: true }).where(eq(nutritionInsights.id, id));
  }

  async getProgressPhotos(userId: string): Promise<ProgressPhoto[]> {
    return db.select().from(progressPhotos).where(eq(progressPhotos.userId, userId)).orderBy(desc(progressPhotos.takenAt));
  }

  async createProgressPhoto(data: InsertProgressPhoto): Promise<ProgressPhoto> {
    const [photo] = await db.insert(progressPhotos).values(data).returning();
    return photo;
  }

  async deleteProgressPhoto(id: string): Promise<void> {
    await db.delete(progressPhotos).where(eq(progressPhotos.id, id));
  }

  async getMealReminders(userId: string): Promise<MealReminder[]> {
    return db.select().from(mealReminders)
      .where(eq(mealReminders.userId, userId))
      .orderBy(asc(mealReminders.mealType));
  }

  async upsertMealReminder(data: InsertMealReminder): Promise<MealReminder> {
    const existing = await db.select().from(mealReminders)
      .where(and(eq(mealReminders.userId, data.userId), eq(mealReminders.mealType, data.mealType)))
      .limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(mealReminders)
        .set({ scheduledTime: data.scheduledTime, enabled: data.enabled, label: data.label, updatedAt: new Date() })
        .where(eq(mealReminders.id, existing[0].id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(mealReminders).values(data).returning();
    return created;
  }

  async deleteMealReminder(id: string): Promise<void> {
    await db.delete(mealReminders).where(eq(mealReminders.id, id));
  }

  // Weight logs — filtered/sorted by the canonical `date` text field (YYYY-MM-DD)
  async getWeightLogs(userId: string, days: number = 90): Promise<WeightLog[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return db.select().from(weightLogs)
      .where(and(eq(weightLogs.userId, userId), gte(weightLogs.date, cutoffStr)))
      .orderBy(desc(weightLogs.date));
  }

  async getLatestWeight(userId: string): Promise<WeightLog | undefined> {
    const [row] = await db.select().from(weightLogs)
      .where(eq(weightLogs.userId, userId))
      .orderBy(desc(weightLogs.date))
      .limit(1);
    return row;
  }

  async createWeightLog(data: InsertWeightLog): Promise<WeightLog> {
    const [row] = await db.insert(weightLogs).values(data).returning();
    return row;
  }

  async deleteWeightLog(id: string, userId: string): Promise<void> {
    await db.delete(weightLogs).where(and(eq(weightLogs.id, id), eq(weightLogs.userId, userId)));
  }

  // Saved foods
  async getSavedFoods(userId: string): Promise<SavedFood[]> {
    return db.select().from(savedFoods)
      .where(eq(savedFoods.userId, userId))
      .orderBy(desc(savedFoods.savedAt));
  }

  async saveFood(data: InsertSavedFood): Promise<SavedFood> {
    // Deduplicate: return existing row if name already saved for this user
    const [existing] = await db.select().from(savedFoods)
      .where(and(eq(savedFoods.userId, data.userId), ilike(savedFoods.name, data.name)))
      .limit(1);
    if (existing) return existing;
    const [row] = await db.insert(savedFoods).values(data).returning();
    return row;
  }

  async unsaveFood(id: string, userId: string): Promise<void> {
    await db.delete(savedFoods).where(and(eq(savedFoods.id, id), eq(savedFoods.userId, userId)));
  }

  async isFoodSaved(userId: string, name: string): Promise<SavedFood | undefined> {
    const [row] = await db.select().from(savedFoods)
      .where(and(eq(savedFoods.userId, userId), ilike(savedFoods.name, name)))
      .limit(1);
    return row;
  }

  // Grocery items
  async getGroceryItems(userId: string, planId?: string): Promise<GroceryItem[]> {
    if (planId) {
      return db.select().from(groceryItems)
        .where(and(eq(groceryItems.userId, userId), eq(groceryItems.planId, planId)))
        .orderBy(asc(groceryItems.category), asc(groceryItems.createdAt));
    }
    return db.select().from(groceryItems)
      .where(eq(groceryItems.userId, userId))
      .orderBy(asc(groceryItems.category), asc(groceryItems.createdAt));
  }

  async createGroceryItem(data: InsertGroceryItem): Promise<GroceryItem> {
    const [row] = await db.insert(groceryItems).values(data).returning();
    return row;
  }

  async toggleGroceryItem(id: string, userId: string, checked: boolean): Promise<GroceryItem | undefined> {
    const [row] = await db.update(groceryItems).set({ checked }).where(and(eq(groceryItems.id, id), eq(groceryItems.userId, userId))).returning();
    return row;
  }

  async deleteGroceryItem(id: string, userId: string): Promise<void> {
    await db.delete(groceryItems).where(and(eq(groceryItems.id, id), eq(groceryItems.userId, userId)));
  }

  async getMealTemplates(userId: string): Promise<any[]> {
    return db.select().from(mealTemplates).where(eq(mealTemplates.userId, userId)).orderBy(desc(mealTemplates.createdAt));
  }

  async createMealTemplate(data: { userId: string; name: string; foods: any[]; totalCalories: number }): Promise<any> {
    const [row] = await db.insert(mealTemplates).values({
      userId: data.userId,
      name: data.name,
      foods: data.foods,
      totalCalories: data.totalCalories,
    }).returning();
    return row;
  }

  async deleteMealTemplate(id: string, userId: string): Promise<void> {
    await db.delete(mealTemplates).where(and(eq(mealTemplates.id, id), eq(mealTemplates.userId, userId)));
  }

  async seedGroceryFromPlan(userId: string, planId: string, items: { item: string; category: string }[]): Promise<"seeded" | "already_seeded" | "not_owned"> {
    if (!items.length) return "already_seeded";
    // Verify ownership — only the plan's owner can seed its grocery list
    const [plan] = await db.select({ grocerySeeded: generatedPlans.grocerySeeded, ownerId: generatedPlans.userId })
      .from(generatedPlans).where(eq(generatedPlans.id, planId)).limit(1);
    if (!plan) return "not_owned";
    if (plan.ownerId !== userId) return "not_owned";
    if (plan.grocerySeeded) return "already_seeded";
    await db.insert(groceryItems).values(
      items.map(i => ({ userId, planId, item: i.item, category: i.category, checked: false }))
    );
    await db.update(generatedPlans)
      .set({ grocerySeeded: true })
      .where(and(eq(generatedPlans.id, planId), eq(generatedPlans.userId, userId)));
    return "seeded";
  }
}

export const storage = new DatabaseStorage();
