import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").default(""),
  password: text("password").default(""),
  supabaseId: text("supabase_id").unique(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").default("client"),
  coachId: varchar("coach_id"),
  name: text("name"),
  age: integer("age"),
  height: real("height"),
  weight: real("weight"),
  targetWeight: real("target_weight"),
  motivation: text("motivation"),
  dietType: text("diet_type").default("non-veg"),
  cuisinePreference: text("cuisine_preference").default("mixed"),
  gender: text("gender").default("Male"),
  activityLevel: text("activity_level").default("moderate"),
  dailyCalorieTarget: integer("daily_calorie_target").default(2400),
  proteinTarget: integer("protein_target").default(160),
  carbsTarget: integer("carbs_target").default(220),
  fatTarget: integer("fat_target").default(70),
  onboardingComplete: boolean("onboarding_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const mealLogs = pgTable("meal_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  calories: integer("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  fiber: real("fiber").default(0),
  sugar: real("sugar").default(0),
  sodium: real("sodium").default(0),
  image: text("image"),
  ingredients: text("ingredients"),
  loggedAt: timestamp("logged_at").defaultNow(),
});

export const waterLogs = pgTable("water_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amount: integer("amount").notNull(),
  loggedAt: timestamp("logged_at").defaultNow(),
});

export const exercises = pgTable("exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  equipment: text("equipment"),
  difficulty: text("difficulty").notNull(),
  instructions: text("instructions"),
  videoUrl: text("video_url"),
  image: text("image"),
  primaryMuscles: text("primary_muscles").array(),
  secondaryMuscles: text("secondary_muscles").array(),
  sets: integer("sets"),
  reps: text("reps"),
  restSeconds: integer("rest_seconds"),
});

export const workoutPlans = pgTable("workout_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  durationMinutes: integer("duration_minutes"),
  estimatedCalories: integer("estimated_calories"),
  image: text("image"),
  exerciseIds: text("exercise_ids").array(),
});

export const workoutLogs = pgTable("workout_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  workoutPlanId: varchar("workout_plan_id"),
  exerciseName: text("exercise_name").notNull(),
  setsCompleted: integer("sets_completed"),
  repsCompleted: text("reps_completed"),
  caloriesBurned: integer("calories_burned"),
  duration: integer("duration"),
  intensity: text("intensity"),
  loggedAt: timestamp("logged_at").defaultNow(),
});

export const mealPlans = pgTable("meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  cuisine: text("cuisine").notNull(),
  dietType: text("diet_type").notNull(),
  calories: integer("calories").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  ingredients: text("ingredients").array(),
  instructions: text("instructions"),
  image: text("image"),
  tags: text("tags").array(),
});

export const foodNutrition = pgTable("food_nutrition", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  food: text("food").notNull(),
  caloricValue: real("caloric_value").notNull(),
  fat: real("fat").notNull(),
  saturatedFats: real("saturated_fats").notNull(),
  monounsaturatedFats: real("monounsaturated_fats").notNull(),
  polyunsaturatedFats: real("polyunsaturated_fats").notNull(),
  carbohydrates: real("carbohydrates").notNull(),
  sugars: real("sugars").notNull(),
  protein: real("protein").notNull(),
  dietaryFiber: real("dietary_fiber").notNull(),
  cholesterol: real("cholesterol").notNull(),
  sodium: real("sodium").notNull(),
  water: real("water").notNull(),
  vitaminA: real("vitamin_a").notNull(),
  vitaminB1: real("vitamin_b1").notNull(),
  vitaminB11: real("vitamin_b11").notNull(),
  vitaminB12: real("vitamin_b12").notNull(),
  vitaminB2: real("vitamin_b2").notNull(),
  vitaminB3: real("vitamin_b3").notNull(),
  vitaminB5: real("vitamin_b5").notNull(),
  vitaminB6: real("vitamin_b6").notNull(),
  vitaminC: real("vitamin_c").notNull(),
  vitaminD: real("vitamin_d").notNull(),
  vitaminE: real("vitamin_e").notNull(),
  vitaminK: real("vitamin_k").notNull(),
  calcium: real("calcium").notNull(),
  copper: real("copper").notNull(),
  iron: real("iron").notNull(),
  magnesium: real("magnesium").notNull(),
  manganese: real("manganese").notNull(),
  phosphorus: real("phosphorus").notNull(),
  potassium: real("potassium").notNull(),
  selenium: real("selenium").notNull(),
  zinc: real("zinc").notNull(),
  nutritionDensity: real("nutrition_density").notNull(),
});

export const openFoodFacts = pgTable("open_food_facts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code"),
  productName: text("product_name"),
  genericName: text("generic_name"),
  brands: text("brands"),
  categories: text("categories"),
  categoriesEn: text("categories_en"),
  mainCategory: text("main_category"),
  ingredientsText: text("ingredients_text"),
  allergens: text("allergens"),
  servingSize: text("serving_size"),
  nutritionGrade: text("nutrition_grade"),
  nutritionScoreFr: real("nutrition_score_fr"),
  energy100g: real("energy_100g"),
  fat100g: real("fat_100g"),
  saturatedFat100g: real("saturated_fat_100g"),
  carbohydrates100g: real("carbohydrates_100g"),
  sugars100g: real("sugars_100g"),
  fiber100g: real("fiber_100g"),
  proteins100g: real("proteins_100g"),
  salt100g: real("salt_100g"),
  sodium100g: real("sodium_100g"),
  vitaminA100g: real("vitamin_a_100g"),
  vitaminC100g: real("vitamin_c_100g"),
  vitaminD100g: real("vitamin_d_100g"),
  calcium100g: real("calcium_100g"),
  iron100g: real("iron_100g"),
  magnesium100g: real("magnesium_100g"),
  potassium100g: real("potassium_100g"),
  zinc100g: real("zinc_100g"),
  carbonFootprint100g: real("carbon_footprint_100g"),
  imageUrl: text("image_url"),
});

export const stepsData = pgTable("steps_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(),
  stepCount: integer("step_count").notNull(),
  distanceKm: real("distance_km").notNull(),
  activeMinutes: integer("active_minutes").notNull(),
  flightsClimbed: integer("flights_climbed").notNull(),
  goal: integer("goal").notNull(),
  goalPercentage: integer("goal_percentage").notNull(),
  calories: integer("calories").notNull(),
});

export const fitnessData = pgTable("fitness_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  age: real("age").notNull(),
  gender: text("gender").notNull(),
  weight: real("weight").notNull(),
  height: real("height").notNull(),
  maxBpm: integer("max_bpm").notNull(),
  avgBpm: integer("avg_bpm").notNull(),
  restingBpm: integer("resting_bpm").notNull(),
  sessionDuration: real("session_duration").notNull(),
  caloriesBurned: real("calories_burned").notNull(),
  workoutType: text("workout_type").notNull(),
  fatPercentage: real("fat_percentage").notNull(),
  waterIntake: real("water_intake").notNull(),
  workoutFrequency: integer("workout_frequency").notNull(),
  experienceLevel: integer("experience_level").notNull(),
  bmi: real("bmi").notNull(),
});

export const inviteCodes = pgTable("invite_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(),
  coachId: varchar("coach_id").notNull(),
  usedBy: varchar("used_by"),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const coachPlans = pgTable("coach_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id").notNull(),
  clientId: varchar("client_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  items: jsonb("items"),
  durationWeeks: integer("duration_weeks").default(4),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull(),
  receiverId: varchar("receiver_id").notNull(),
  content: text("content").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const onboardingProfiles = pgTable("onboarding_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  completed: boolean("completed").default(false),
  gender: text("gender"),
  age: integer("age"),
  heightCm: real("height_cm"),
  weightKgCurrent: real("weight_kg_current"),
  weightKgTarget: real("weight_kg_target"),
  goalTimelineDays: integer("goal_timeline_days"),
  goalDescription: text("goal_description"),
  activityLevel: text("activity_level"),
  dietaryPreferences: text("dietary_preferences"),
  cuisines: text("cuisines").array(),
  allergies: text("allergies").array(),
  dislikes: text("dislikes").array(),
  budgetLevel: text("budget_level"),
  cookingTimeAvailable: integer("cooking_time_available"),
  equipmentAvailable: text("equipment_available").array(),
  injuriesLimitations: text("injuries_limitations"),
  sleepHoursAvg: real("sleep_hours_avg"),
  waterTargetMl: integer("water_target_ml"),
  notesFreeText: text("notes_free_text"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const generatedPlans = pgTable("generated_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  onboardingProfileId: varchar("onboarding_profile_id"),
  status: text("status").default("generating"),
  planJson: jsonb("plan_json"),
  modelName: text("model_name"),
  failureReason: text("failure_reason"),
  planVersion: integer("plan_version").default(1),
  activityTypesDetected: jsonb("activity_types_detected"),
  modulesEnabled: jsonb("modules_enabled"),
  generationStage: text("generation_stage"),
  generationProgress: integer("generation_progress").default(0),
  grocerySeeded: boolean("grocery_seeded").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversationSessions = pgTable("conversation_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  status: text("status").default("active"),
  draftSummary: jsonb("draft_summary"),
  finalizeReady: boolean("finalize_ready").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversationMessages = pgTable("conversation_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  structuredData: jsonb("structured_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  activityType: text("activity_type").notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  durationMin: integer("duration_min"),
  metadataJson: jsonb("metadata_json"),
  planId: varchar("plan_id"),
  planDay: integer("plan_day"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const weeklyMealPresets = pgTable("weekly_meal_presets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  mealType: text("meal_type").notNull(),
  name: text("name").notNull(),
  calories: integer("calories").notNull(),
  protein: real("protein").default(0),
  carbs: real("carbs").default(0),
  fat: real("fat").default(0),
  fiber: real("fiber").default(0),
  sugar: real("sugar").default(0),
  sodium: real("sodium").default(0),
  ingredients: text("ingredients"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const nutritionInsights = pgTable("nutrition_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  severity: text("severity").default("info"),
  actionSuggestion: text("action_suggestion"),
  dismissed: boolean("dismissed").default(false),
  triggerData: jsonb("trigger_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const progressPhotos = pgTable("progress_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  imageUrl: text("image_url").notNull(),
  category: text("category").default("front"),
  weight: real("weight"),
  bodyFatPercent: real("body_fat_percent"),
  note: text("note"),
  takenAt: timestamp("taken_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mealReminders = pgTable("meal_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  mealType: text("meal_type").notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  enabled: boolean("enabled").default(true),
  label: text("label"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const weightLogs = pgTable("weight_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  weightKg: real("weight_kg").notNull(),
  date: text("date").notNull(),
  notes: text("notes"),
  loggedAt: timestamp("logged_at").defaultNow(),
});

export const savedFoods = pgTable("saved_foods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  calories: integer("calories").notNull(),
  protein: real("protein").default(0),
  carbs: real("carbs").default(0),
  fat: real("fat").default(0),
  fiber: real("fiber").default(0),
  sugar: real("sugar").default(0),
  sodium: real("sodium").default(0),
  source: text("source").default("manual"),
  savedAt: timestamp("saved_at").defaultNow(),
});

export const groceryItems = pgTable("grocery_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  planId: varchar("plan_id"),
  item: text("item").notNull(),
  category: text("category").default("Other"),
  checked: boolean("checked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMealLogSchema = createInsertSchema(mealLogs).omit({ id: true, loggedAt: true });
export const insertWaterLogSchema = createInsertSchema(waterLogs).omit({ id: true, loggedAt: true });
export const insertExerciseSchema = createInsertSchema(exercises).omit({ id: true });
export const insertWorkoutPlanSchema = createInsertSchema(workoutPlans).omit({ id: true });
export const insertWorkoutLogSchema = createInsertSchema(workoutLogs).omit({ id: true, loggedAt: true });
export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({ id: true });
export const insertStepsDataSchema = createInsertSchema(stepsData).omit({ id: true });
export const insertFitnessDataSchema = createInsertSchema(fitnessData).omit({ id: true });
export const insertFoodNutritionSchema = createInsertSchema(foodNutrition).omit({ id: true });
export const insertOpenFoodFactsSchema = createInsertSchema(openFoodFacts).omit({ id: true });
export const insertInviteCodeSchema = createInsertSchema(inviteCodes).omit({ id: true, createdAt: true });
export const insertCoachPlanSchema = createInsertSchema(coachPlans).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertOnboardingProfileSchema = createInsertSchema(onboardingProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGeneratedPlanSchema = createInsertSchema(generatedPlans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConversationSessionSchema = createInsertSchema(conversationSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertConversationMessageSchema = createInsertSchema(conversationMessages).omit({ id: true, createdAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export const insertWeeklyMealPresetSchema = createInsertSchema(weeklyMealPresets).omit({ id: true, createdAt: true });
export const insertNutritionInsightSchema = createInsertSchema(nutritionInsights).omit({ id: true, createdAt: true });
export const insertProgressPhotoSchema = createInsertSchema(progressPhotos).omit({ id: true, createdAt: true });
export const insertMealReminderSchema = createInsertSchema(mealReminders).omit({ id: true, updatedAt: true });
export const mealTemplates = pgTable("meal_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  foods: jsonb("foods").notNull().$type<Array<{ name: string; calories: number; protein: number; carbs: number; fat: number; fiber?: number; sugar?: number; sodium?: number }>>(),
  totalCalories: integer("total_calories").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWeightLogSchema = createInsertSchema(weightLogs).omit({ id: true, loggedAt: true });
export const insertSavedFoodSchema = createInsertSchema(savedFoods).omit({ id: true, savedAt: true });
export const insertGroceryItemSchema = createInsertSchema(groceryItems).omit({ id: true, createdAt: true });
export const insertMealTemplateSchema = createInsertSchema(mealTemplates).omit({ id: true, createdAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type MealTemplate = typeof mealTemplates.$inferSelect;
export type InsertMealTemplate = z.infer<typeof insertMealTemplateSchema>;
export type InsertMealLog = z.infer<typeof insertMealLogSchema>;
export type MealLog = typeof mealLogs.$inferSelect;
export type InsertWaterLog = z.infer<typeof insertWaterLogSchema>;
export type WaterLog = typeof waterLogs.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type WorkoutPlan = typeof workoutPlans.$inferSelect;
export type InsertWorkoutPlan = z.infer<typeof insertWorkoutPlanSchema>;
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type InsertWorkoutLog = z.infer<typeof insertWorkoutLogSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;
export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type StepsData = typeof stepsData.$inferSelect;
export type InsertStepsData = z.infer<typeof insertStepsDataSchema>;
export type FitnessData = typeof fitnessData.$inferSelect;
export type InsertFitnessData = z.infer<typeof insertFitnessDataSchema>;
export type FoodNutrition = typeof foodNutrition.$inferSelect;
export type InsertFoodNutrition = z.infer<typeof insertFoodNutritionSchema>;
export type OpenFoodFact = typeof openFoodFacts.$inferSelect;
export type InsertOpenFoodFact = z.infer<typeof insertOpenFoodFactsSchema>;
export type InviteCode = typeof inviteCodes.$inferSelect;
export type InsertInviteCode = z.infer<typeof insertInviteCodeSchema>;
export type CoachPlan = typeof coachPlans.$inferSelect;
export type InsertCoachPlan = z.infer<typeof insertCoachPlanSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type OnboardingProfile = typeof onboardingProfiles.$inferSelect;
export type InsertOnboardingProfile = z.infer<typeof insertOnboardingProfileSchema>;
export type GeneratedPlan = typeof generatedPlans.$inferSelect;
export type InsertGeneratedPlan = z.infer<typeof insertGeneratedPlanSchema>;
export type ConversationSession = typeof conversationSessions.$inferSelect;
export type InsertConversationSession = z.infer<typeof insertConversationSessionSchema>;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type InsertConversationMessage = z.infer<typeof insertConversationMessageSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type WeeklyMealPreset = typeof weeklyMealPresets.$inferSelect;
export type InsertWeeklyMealPreset = z.infer<typeof insertWeeklyMealPresetSchema>;
export type NutritionInsight = typeof nutritionInsights.$inferSelect;
export type InsertNutritionInsight = z.infer<typeof insertNutritionInsightSchema>;
export type ProgressPhoto = typeof progressPhotos.$inferSelect;
export type InsertProgressPhoto = z.infer<typeof insertProgressPhotoSchema>;
export type MealReminder = typeof mealReminders.$inferSelect;
export type InsertMealReminder = z.infer<typeof insertMealReminderSchema>;
export type WeightLog = typeof weightLogs.$inferSelect;
export type InsertWeightLog = z.infer<typeof insertWeightLogSchema>;
export type SavedFood = typeof savedFoods.$inferSelect;
export type InsertSavedFood = z.infer<typeof insertSavedFoodSchema>;
export type GroceryItem = typeof groceryItems.$inferSelect;
export type InsertGroceryItem = z.infer<typeof insertGroceryItemSchema>;

export * from "./models/chat";
