// Rule-based plan generator — no AI API required.
// Uses the user's profile to compute TDEE, macros, and generate
// a full 7-day plan with meals, workouts, water schedule, grocery list & milestones.

interface MealTemplate {
  title: string;
  type: "breakfast" | "lunch" | "snack" | "dinner";
  cuisines: string[];
  diet: ("veg" | "non-veg" | "vegan")[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients: string[];
  instructions: string;
}

interface WorkoutTemplate {
  title: string;
  focus: string;
  duration_min: number;
  calories_burn_est: number;
  type: "strength" | "cardio" | "hiit" | "rest";
  steps: { name: string; detail: string }[];
}

// ── Meal Database ────────────────────────────────────────────────────────────
const MEALS: MealTemplate[] = [
  // ── BREAKFASTS ──────────────────────────────────────────────────────────
  { title: "Masala Omelette with Whole Wheat Toast", type: "breakfast", cuisines: ["Indian", "Nepali"], diet: ["non-veg"], calories: 380, protein_g: 24, carbs_g: 30, fat_g: 16, ingredients: ["3 eggs", "1 onion", "1 tomato", "green chili", "coriander", "2 slices whole wheat bread", "salt & pepper", "1 tsp oil"], instructions: "Beat eggs with chopped onion, tomato, chili and coriander. Cook in a lightly oiled pan. Serve with whole wheat toast." },
  { title: "Vegetable Poha", type: "breakfast", cuisines: ["Indian"], diet: ["veg", "vegan"], calories: 320, protein_g: 9, carbs_g: 52, fat_g: 8, ingredients: ["1.5 cups flattened rice", "1 onion", "1 potato", "mustard seeds", "curry leaves", "turmeric", "peas", "lemon juice", "coriander"], instructions: "Rinse poha. Temper mustard seeds and curry leaves, sauté vegetables, add turmeric and poha. Mix well, finish with lemon." },
  { title: "Dal Cheela with Mint Chutney", type: "breakfast", cuisines: ["Indian"], diet: ["veg", "vegan"], calories: 340, protein_g: 18, carbs_g: 44, fat_g: 8, ingredients: ["1 cup moong dal", "ginger", "green chili", "cumin", "salt", "mint chutney"], instructions: "Soak and blend moong dal. Add spices, make thin pancakes on a non-stick pan. Serve with mint chutney." },
  { title: "Aloo Paratha with Curd", type: "breakfast", cuisines: ["Indian", "Nepali"], diet: ["veg"], calories: 420, protein_g: 12, carbs_g: 58, fat_g: 14, ingredients: ["2 whole wheat parathas", "2 boiled potatoes", "cumin", "green chili", "coriander", "1 cup low-fat curd", "ghee"], instructions: "Mash spiced potato filling. Stuff into whole wheat dough, roll and cook on a tawa with minimal ghee. Serve with curd." },
  { title: "Sel Roti with Achar", type: "breakfast", cuisines: ["Nepali"], diet: ["veg", "vegan"], calories: 360, protein_g: 7, carbs_g: 62, fat_g: 8, ingredients: ["2 cups rice flour", "banana", "sugar", "cardamom", "water", "tomato achar"], instructions: "Blend rice flour with banana, sugar and cardamom. Fry ring-shaped rotis until golden. Serve with tomato achar." },
  { title: "Beaten Rice (Chiura) with Eggs", type: "breakfast", cuisines: ["Nepali"], diet: ["non-veg"], calories: 350, protein_g: 20, carbs_g: 42, fat_g: 10, ingredients: ["1 cup chiura", "2 eggs", "1 banana", "salt", "1 tsp oil"], instructions: "Fry eggs with salt. Soak chiura briefly. Serve chiura with fried eggs and banana on the side." },
  { title: "Chinese Congee (Rice Porridge)", type: "breakfast", cuisines: ["Chinese"], diet: ["veg", "vegan"], calories: 280, protein_g: 8, carbs_g: 52, fat_g: 3, ingredients: ["0.5 cup rice", "4 cups water/broth", "ginger slices", "spring onion", "soy sauce", "sesame oil"], instructions: "Simmer rice in broth with ginger for 30 mins until creamy. Top with spring onion and a dash of sesame oil." },
  { title: "Steamed Egg Custard with Rice", type: "breakfast", cuisines: ["Chinese"], diet: ["non-veg"], calories: 330, protein_g: 18, carbs_g: 38, fat_g: 10, ingredients: ["3 eggs", "1 cup warm broth", "soy sauce", "sesame oil", "1 cup steamed rice", "spring onion"], instructions: "Beat eggs with broth, strain, steam gently for 12 mins until silky. Drizzle with soy sauce and sesame oil." },
  { title: "Egg White Bhurji with Multigrain Toast", type: "breakfast", cuisines: ["Indian"], diet: ["non-veg"], calories: 310, protein_g: 28, carbs_g: 26, fat_g: 8, ingredients: ["5 egg whites", "1 onion", "1 tomato", "capsicum", "turmeric", "2 multigrain slices"], instructions: "Scramble egg whites with sautéed onion, tomato, capsicum and spices. Serve with multigrain toast." },
  { title: "Oats Upma with Vegetables", type: "breakfast", cuisines: ["Indian"], diet: ["veg", "vegan"], calories: 300, protein_g: 10, carbs_g: 46, fat_g: 7, ingredients: ["1 cup rolled oats", "carrot", "peas", "mustard seeds", "curry leaves", "1 onion", "salt", "lemon"], instructions: "Toast oats. Temper mustard seeds, sauté vegetables, add oats with water and cook 5 mins. Finish with lemon." },
  { title: "Thukpa Noodle Soup", type: "breakfast", cuisines: ["Nepali", "Chinese"], diet: ["non-veg"], calories: 390, protein_g: 22, carbs_g: 48, fat_g: 10, ingredients: ["100g egg noodles", "chicken or tofu", "bok choy", "garlic", "ginger", "soy sauce", "chili", "spring onion"], instructions: "Simmer broth with ginger and garlic. Add noodles and protein, cook through. Add bok choy, season with soy sauce." },

  // ── LUNCHES ─────────────────────────────────────────────────────────────
  { title: "Dal Tadka with Brown Rice", type: "lunch", cuisines: ["Indian", "Nepali"], diet: ["veg", "vegan"], calories: 480, protein_g: 22, carbs_g: 72, fat_g: 10, ingredients: ["1 cup yellow dal", "1 cup brown rice", "tomatoes", "onion", "cumin", "mustard", "garlic", "ginger", "turmeric", "ghee"], instructions: "Cook dal with turmeric until soft. Prepare rice. Make tadka with cumin, garlic, tomatoes. Mix into dal." },
  { title: "Chicken Dal Bhat", type: "lunch", cuisines: ["Nepali", "Indian"], diet: ["non-veg"], calories: 580, protein_g: 42, carbs_g: 65, fat_g: 14, ingredients: ["150g chicken", "1 cup rice", "0.5 cup lentils", "spinach", "garlic", "ginger", "cumin", "coriander", "turmeric"], instructions: "Cook lentils with turmeric. Prepare rice. Cook chicken with spices until tender. Serve together." },
  { title: "Palak Paneer with Chapati", type: "lunch", cuisines: ["Indian"], diet: ["veg"], calories: 490, protein_g: 24, carbs_g: 48, fat_g: 20, ingredients: ["200g paneer", "300g spinach", "2 chapatis", "cream", "garlic", "ginger", "onion", "cumin", "garam masala"], instructions: "Blanch spinach, blend. Cook with sautéed onion-tomato-spice base. Add paneer cubes. Serve with chapati." },
  { title: "Kung Pao Chicken with Steamed Rice", type: "lunch", cuisines: ["Chinese"], diet: ["non-veg"], calories: 520, protein_g: 38, carbs_g: 52, fat_g: 16, ingredients: ["200g chicken", "peanuts", "dried chilies", "spring onion", "garlic", "soy sauce", "hoisin", "rice"], instructions: "Marinate chicken. Stir-fry with dried chilies and garlic. Add sauce, toss with peanuts. Serve over rice." },
  { title: "Mapo Tofu with Brown Rice", type: "lunch", cuisines: ["Chinese"], diet: ["veg"], calories: 440, protein_g: 22, carbs_g: 48, fat_g: 18, ingredients: ["300g firm tofu", "doubanjiang", "soy sauce", "garlic", "ginger", "spring onion", "Sichuan pepper", "1 cup brown rice"], instructions: "Stir-fry doubanjiang with garlic and ginger. Add tofu gently, season. Simmer briefly, top with spring onion." },
  { title: "Chicken Fried Rice", type: "lunch", cuisines: ["Chinese", "Indian"], diet: ["non-veg"], calories: 510, protein_g: 32, carbs_g: 58, fat_g: 14, ingredients: ["1.5 cups cooked rice", "150g chicken breast", "2 eggs", "mixed vegetables", "soy sauce", "sesame oil", "garlic", "ginger"], instructions: "Stir-fry garlic and ginger. Add chicken, scramble eggs, toss in cold rice. Season with soy sauce and sesame oil." },
  { title: "Rajma Chawal", type: "lunch", cuisines: ["Indian", "Nepali"], diet: ["veg", "vegan"], calories: 500, protein_g: 24, carbs_g: 78, fat_g: 8, ingredients: ["1 cup rajma", "1 cup rice", "onion", "tomatoes", "ginger-garlic paste", "cumin", "coriander powder", "garam masala"], instructions: "Pressure cook rajma. Cook rich onion-tomato masala, add rajma and simmer 15 mins. Serve with rice." },
  { title: "Grilled Fish with Stir-Fried Vegetables", type: "lunch", cuisines: ["Indian", "Chinese"], diet: ["non-veg"], calories: 430, protein_g: 42, carbs_g: 28, fat_g: 14, ingredients: ["200g fish fillet", "broccoli", "bell peppers", "carrot", "garlic", "lemon", "soy sauce", "olive oil"], instructions: "Marinate fish with lemon and spices, grill 4 min each side. Stir-fry vegetables with garlic and soy sauce." },
  { title: "Momo with Soup", type: "lunch", cuisines: ["Nepali", "Chinese"], diet: ["non-veg"], calories: 460, protein_g: 28, carbs_g: 52, fat_g: 14, ingredients: ["200g momo wrappers", "200g minced chicken", "cabbage", "onion", "ginger", "garlic", "soy sauce", "sesame oil"], instructions: "Mix filling, fold momos. Steam for 12 mins. Serve with momo soup and spicy tomato chutney." },
  { title: "Veg Momo with Achar", type: "lunch", cuisines: ["Nepali"], diet: ["veg", "vegan"], calories: 380, protein_g: 14, carbs_g: 58, fat_g: 8, ingredients: ["momo wrappers", "cabbage", "carrot", "tofu", "ginger", "garlic", "soy sauce", "coriander"], instructions: "Mix vegetable-tofu filling, fold momos. Steam 10 mins. Serve with spicy tomato achar." },
  { title: "Egg Curry with Rice", type: "lunch", cuisines: ["Indian", "Nepali"], diet: ["non-veg"], calories: 490, protein_g: 26, carbs_g: 58, fat_g: 16, ingredients: ["4 eggs", "1 cup rice", "onion", "tomatoes", "garlic", "ginger", "cumin", "turmeric", "coriander powder"], instructions: "Hard boil eggs, halve. Cook rich tomato gravy with spices, add eggs. Simmer and serve with rice." },
  { title: "Hot and Sour Soup with Noodles", type: "lunch", cuisines: ["Chinese"], diet: ["veg"], calories: 380, protein_g: 16, carbs_g: 52, fat_g: 10, ingredients: ["100g egg noodles", "tofu", "mushrooms", "bamboo shoots", "vinegar", "soy sauce", "egg", "cornstarch", "chili oil"], instructions: "Simmer broth with mushrooms and bamboo shoots. Thicken with cornstarch. Add tofu and egg drop. Season with vinegar." },
  { title: "Chicken Chow Mein", type: "lunch", cuisines: ["Chinese"], diet: ["non-veg"], calories: 530, protein_g: 35, carbs_g: 60, fat_g: 14, ingredients: ["150g chicken", "100g egg noodles", "bok choy", "bean sprouts", "soy sauce", "oyster sauce", "garlic", "sesame oil"], instructions: "Boil noodles. Stir-fry chicken, add vegetables, toss with noodles and sauce over high heat." },
  { title: "Paneer Bhurji with Roti", type: "lunch", cuisines: ["Indian"], diet: ["veg"], calories: 450, protein_g: 26, carbs_g: 44, fat_g: 18, ingredients: ["200g paneer", "3 rotis", "onion", "tomatoes", "capsicum", "turmeric", "cumin", "coriander", "chili"], instructions: "Crumble paneer. Sauté vegetables, add spices, mix in paneer. Cook 5 mins. Serve with soft rotis." },

  // ── SNACKS ──────────────────────────────────────────────────────────────
  { title: "Roasted Chana with Cucumber", type: "snack", cuisines: ["Indian", "Nepali"], diet: ["veg", "vegan"], calories: 220, protein_g: 14, carbs_g: 28, fat_g: 4, ingredients: ["1 cup roasted chana", "1 cucumber", "lemon juice", "chaat masala", "salt"], instructions: "Season roasted chana with lemon and chaat masala. Serve with sliced cucumber." },
  { title: "Boiled Eggs", type: "snack", cuisines: ["Indian", "Nepali", "Chinese"], diet: ["non-veg"], calories: 180, protein_g: 16, carbs_g: 1, fat_g: 12, ingredients: ["2 eggs", "salt", "black pepper"], instructions: "Boil eggs for 8 mins. Peel and season with salt and black pepper." },
  { title: "Greek Yogurt with Banana", type: "snack", cuisines: ["Indian", "Nepali"], diet: ["veg"], calories: 210, protein_g: 14, carbs_g: 30, fat_g: 3, ingredients: ["150g Greek yogurt", "1 banana", "honey"], instructions: "Serve Greek yogurt topped with sliced banana and a drizzle of honey." },
  { title: "Mixed Nut Handful", type: "snack", cuisines: ["Indian", "Nepali", "Chinese"], diet: ["veg", "vegan"], calories: 200, protein_g: 6, carbs_g: 8, fat_g: 16, ingredients: ["30g almonds", "10g walnuts", "10g cashews"], instructions: "Mix nuts and portion into a small bowl. Eat slowly." },
  { title: "Steamed Edamame with Sea Salt", type: "snack", cuisines: ["Chinese"], diet: ["veg", "vegan"], calories: 190, protein_g: 16, carbs_g: 14, fat_g: 6, ingredients: ["1 cup edamame in pods", "sea salt", "sesame oil (optional)"], instructions: "Steam edamame 5 mins. Sprinkle sea salt. Eat from pods." },
  { title: "Peanut Butter on Rice Cake", type: "snack", cuisines: ["Indian", "Chinese"], diet: ["veg", "vegan"], calories: 220, protein_g: 8, carbs_g: 26, fat_g: 10, ingredients: ["2 rice cakes", "2 tbsp peanut butter"], instructions: "Spread peanut butter evenly on rice cakes." },
  { title: "Fruits & Curd Bowl", type: "snack", cuisines: ["Indian", "Nepali"], diet: ["veg"], calories: 190, protein_g: 8, carbs_g: 30, fat_g: 3, ingredients: ["1 apple", "1 cup low-fat curd", "chaat masala"], instructions: "Dice apple into curd, sprinkle chaat masala." },
  { title: "Sprout Chaat", type: "snack", cuisines: ["Indian"], diet: ["veg", "vegan"], calories: 200, protein_g: 12, carbs_g: 30, fat_g: 2, ingredients: ["1 cup mixed sprouts", "tomato", "onion", "lemon", "chaat masala", "coriander"], instructions: "Toss sprouts with chopped vegetables, lemon and spices." },
  { title: "Steamed Corn with Butter", type: "snack", cuisines: ["Indian", "Nepali"], diet: ["veg"], calories: 210, protein_g: 5, carbs_g: 38, fat_g: 5, ingredients: ["1 ear corn", "1 tsp butter", "salt", "chili powder"], instructions: "Steam or boil corn. Rub with butter and season." },
  { title: "Tofu Satay Skewers", type: "snack", cuisines: ["Chinese"], diet: ["veg", "vegan"], calories: 220, protein_g: 18, carbs_g: 8, fat_g: 12, ingredients: ["150g firm tofu", "soy sauce", "peanut sauce", "sesame seeds", "skewers"], instructions: "Cube tofu, marinate in soy sauce, grill on skewers. Serve with peanut dipping sauce." },

  // ── DINNERS ─────────────────────────────────────────────────────────────
  { title: "Chicken Tikka Masala with Naan", type: "dinner", cuisines: ["Indian"], diet: ["non-veg"], calories: 560, protein_g: 42, carbs_g: 52, fat_g: 18, ingredients: ["200g chicken", "yogurt marinade", "tomato-cream gravy", "ginger-garlic", "garam masala", "naan"], instructions: "Marinate chicken, grill. Cook rich tomato-cream masala with spices, add grilled chicken. Serve with naan." },
  { title: "Steamed Fish with Ginger-Scallion Sauce", type: "dinner", cuisines: ["Chinese"], diet: ["non-veg"], calories: 380, protein_g: 38, carbs_g: 14, fat_g: 14, ingredients: ["250g white fish", "ginger", "spring onion", "soy sauce", "sesame oil", "chili", "steamed rice 1 cup"], instructions: "Steam fish 8-10 mins. Heat oil with ginger and scallion, pour over fish. Drizzle soy sauce." },
  { title: "Mutton Khana Set (Dal, Rice, Sabji, Achar)", type: "dinner", cuisines: ["Nepali"], diet: ["non-veg"], calories: 620, protein_g: 38, carbs_g: 72, fat_g: 18, ingredients: ["150g mutton", "dal", "rice", "seasonal vegetables", "achar", "ghee", "spices"], instructions: "Pressure cook mutton curry. Prepare dal and rice. Sauté vegetables. Serve the complete thali." },
  { title: "Stir-Fried Broccoli with Tofu", type: "dinner", cuisines: ["Chinese"], diet: ["veg", "vegan"], calories: 380, protein_g: 24, carbs_g: 28, fat_g: 18, ingredients: ["250g firm tofu", "2 cups broccoli", "garlic", "oyster/hoisin sauce", "soy sauce", "sesame oil", "brown rice 1 cup"], instructions: "Press and cube tofu, fry until golden. Blanch broccoli. Stir-fry together with sauce. Serve over rice." },
  { title: "Saag with Makki Roti", type: "dinner", cuisines: ["Indian"], diet: ["veg"], calories: 440, protein_g: 18, carbs_g: 58, fat_g: 14, ingredients: ["500g mustard greens", "2 makki rotis", "garlic", "ginger", "ghee", "onion", "tomato"], instructions: "Cook greens until wilted, blend. Add sauté and simmer. Serve with hot makki rotis and butter." },
  { title: "Prawn Curry with Steamed Rice", type: "dinner", cuisines: ["Indian"], diet: ["non-veg"], calories: 480, protein_g: 36, carbs_g: 52, fat_g: 14, ingredients: ["200g prawns", "1 cup rice", "coconut milk", "tomatoes", "onion", "garlic", "ginger", "curry leaves", "mustard seeds"], instructions: "Cook onion-tomato base with spices. Add coconut milk and prawns. Simmer 8 mins. Serve with rice." },
  { title: "Beef/Chicken Noodle Soup", type: "dinner", cuisines: ["Chinese", "Nepali"], diet: ["non-veg"], calories: 460, protein_g: 34, carbs_g: 48, fat_g: 12, ingredients: ["150g meat", "100g noodles", "bok choy", "mushrooms", "soy sauce", "star anise", "ginger", "broth"], instructions: "Simmer rich broth with spices. Cook noodles. Add vegetables and meat. Season and serve hot." },
  { title: "Mixed Vegetable Curry with Brown Rice", type: "dinner", cuisines: ["Indian", "Nepali"], diet: ["veg", "vegan"], calories: 400, protein_g: 14, carbs_g: 62, fat_g: 10, ingredients: ["mixed vegetables", "1 cup brown rice", "coconut milk", "tomatoes", "onion", "curry powder", "garlic"], instructions: "Cook onion and garlic. Add vegetables, tomatoes, coconut milk and spices. Simmer 20 mins. Serve with rice." },
  { title: "Egg Fried Noodles", type: "dinner", cuisines: ["Chinese", "Indian"], diet: ["non-veg"], calories: 450, protein_g: 22, carbs_g: 54, fat_g: 16, ingredients: ["150g noodles", "3 eggs", "carrot", "capsicum", "soy sauce", "garlic", "ginger", "sesame oil"], instructions: "Cook noodles, drain. Scramble eggs, add vegetables and noodles. Toss with soy sauce." },
  { title: "Paneer Tikka with Mint Rice", type: "dinner", cuisines: ["Indian"], diet: ["veg"], calories: 490, protein_g: 28, carbs_g: 52, fat_g: 18, ingredients: ["200g paneer", "yogurt marinade", "bell peppers", "onion", "1 cup mint rice", "spices"], instructions: "Marinate paneer in spiced yogurt, grill on skewers. Prepare mint rice. Serve together." },
  { title: "Kwati (Mixed Bean Soup)", type: "dinner", cuisines: ["Nepali"], diet: ["veg", "vegan"], calories: 420, protein_g: 22, carbs_g: 64, fat_g: 6, ingredients: ["mixed sprouts/beans", "garlic", "ginger", "onion", "turmeric", "cumin", "coriander", "rice or bread"], instructions: "Pressure cook soaked mixed beans. Temper with spices, add to beans, simmer 15 mins. Serve as soup or with rice." },
  { title: "Sweet and Sour Chicken with Rice", type: "dinner", cuisines: ["Chinese"], diet: ["non-veg"], calories: 520, protein_g: 36, carbs_g: 62, fat_g: 12, ingredients: ["200g chicken", "pineapple", "bell peppers", "vinegar", "sugar", "ketchup", "soy sauce", "cornstarch", "rice"], instructions: "Coat and fry chicken. Make sweet-sour sauce. Toss chicken with sauce, pineapple and peppers. Serve with rice." },
];

// ── Workout Database ──────────────────────────────────────────────────────
const WORKOUTS: WorkoutTemplate[] = [
  {
    title: "Full Body Strength", focus: "Strength", duration_min: 45, calories_burn_est: 280, type: "strength",
    steps: [
      { name: "Bodyweight Squat", detail: "3 sets × 15 reps — keep chest up, knees tracking over toes" },
      { name: "Push-Up", detail: "3 sets × 12 reps — modify on knees if needed" },
      { name: "Dumbbell Row", detail: "3 sets × 12 reps each side" },
      { name: "Reverse Lunge", detail: "3 sets × 10 reps each leg" },
      { name: "Plank Hold", detail: "3 sets × 30 seconds — engage core throughout" },
    ],
  },
  {
    title: "HIIT Cardio Blast", focus: "Cardio", duration_min: 30, calories_burn_est: 320, type: "hiit",
    steps: [
      { name: "Jumping Jacks", detail: "45 sec on / 15 sec rest × 3 rounds" },
      { name: "Burpees", detail: "30 sec on / 30 sec rest × 3 rounds" },
      { name: "High Knees", detail: "45 sec on / 15 sec rest × 3 rounds" },
      { name: "Mountain Climbers", detail: "30 sec on / 30 sec rest × 3 rounds" },
      { name: "Jump Squats", detail: "30 sec on / 30 sec rest × 3 rounds" },
    ],
  },
  {
    title: "Upper Body Focus", focus: "Upper Body", duration_min: 40, calories_burn_est: 240, type: "strength",
    steps: [
      { name: "Push-Up Variations", detail: "4 sets × 10-15 reps (wide, narrow, diamond)" },
      { name: "Dumbbell Shoulder Press", detail: "3 sets × 12 reps" },
      { name: "Dumbbell Bicep Curl", detail: "3 sets × 12 reps each" },
      { name: "Tricep Dips (chair)", detail: "3 sets × 12 reps" },
      { name: "Superman Hold", detail: "3 sets × 15 reps — squeeze back at top" },
    ],
  },
  {
    title: "Lower Body Power", focus: "Legs & Glutes", duration_min: 40, calories_burn_est: 260, type: "strength",
    steps: [
      { name: "Goblet Squat", detail: "4 sets × 15 reps" },
      { name: "Romanian Deadlift", detail: "3 sets × 12 reps — hinge at hips" },
      { name: "Walking Lunge", detail: "3 sets × 20 steps total" },
      { name: "Glute Bridge", detail: "3 sets × 20 reps — squeeze at top" },
      { name: "Calf Raise", detail: "3 sets × 20 reps" },
    ],
  },
  {
    title: "Core & Mobility", focus: "Core", duration_min: 35, calories_burn_est: 180, type: "strength",
    steps: [
      { name: "Dead Bug", detail: "3 sets × 10 reps each side" },
      { name: "Russian Twist", detail: "3 sets × 20 reps total" },
      { name: "Bicycle Crunch", detail: "3 sets × 16 reps" },
      { name: "Side Plank", detail: "2 sets × 20 sec each side" },
      { name: "Cat-Cow Stretch", detail: "2 sets × 10 reps — breathe deeply" },
    ],
  },
  {
    title: "Steady State Cardio", focus: "Endurance", duration_min: 45, calories_burn_est: 350, type: "cardio",
    steps: [
      { name: "Warm-up Walk", detail: "5 mins at easy pace" },
      { name: "Brisk Walk / Light Jog", detail: "30 mins at 60-70% max heart rate — you should be able to hold a conversation" },
      { name: "Bodyweight Squats", detail: "2 sets × 15 reps" },
      { name: "Cool-down Walk", detail: "5 mins slow pace" },
      { name: "Full Body Stretch", detail: "5 mins — focus on quads, hamstrings, calves" },
    ],
  },
  {
    title: "Active Recovery", focus: "Recovery", duration_min: 30, calories_burn_est: 120, type: "rest",
    steps: [
      { name: "Light Walk", detail: "15 mins easy walk — fresh air if possible" },
      { name: "Hip Flexor Stretch", detail: "Hold 30 sec each side × 2" },
      { name: "Hamstring Stretch", detail: "Hold 30 sec each side × 2" },
      { name: "Shoulder & Chest Stretch", detail: "Hold 30 sec each side × 2" },
      { name: "Deep Breathing", detail: "5 mins box breathing: inhale 4s, hold 4s, exhale 4s" },
    ],
  },
  {
    title: "Push-Pull Superset", focus: "Strength", duration_min: 45, calories_burn_est: 270, type: "strength",
    steps: [
      { name: "Push-Up + Dumbbell Row Superset", detail: "4 sets × 10 push-ups + 10 rows each side" },
      { name: "Shoulder Press + Bicep Curl Superset", detail: "3 sets × 12 + 12 reps" },
      { name: "Pike Push-Up", detail: "3 sets × 10 reps" },
      { name: "Reverse Fly", detail: "3 sets × 12 reps" },
      { name: "Plank with Shoulder Tap", detail: "3 sets × 20 taps" },
    ],
  },
];

const WATER_SCHEDULE = [
  { time: "06:30", amount_ml: 500 },
  { time: "09:00", amount_ml: 400 },
  { time: "11:30", amount_ml: 400 },
  { time: "13:30", amount_ml: 400 },
  { time: "16:00", amount_ml: 300 },
  { time: "18:30", amount_ml: 300 },
  { time: "20:30", amount_ml: 200 },
];

// ── Helpers ───────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

function filterMeals(
  type: MealTemplate["type"],
  cuisines: string[],
  isVeg: boolean
): MealTemplate[] {
  const dietFilter = isVeg ? ["veg", "vegan"] : ["non-veg", "veg"];
  const cuisineLower = cuisines.map(c => c.toLowerCase());
  const filtered = MEALS.filter(m =>
    m.type === type &&
    m.diet.some(d => dietFilter.includes(d)) &&
    m.cuisines.some(c => cuisineLower.includes(c.toLowerCase()))
  );
  return filtered.length > 0 ? filtered : MEALS.filter(m => m.type === type && m.diet.some(d => dietFilter.includes(d)));
}

// ── Main Generator ────────────────────────────────────────────────────────
export function generateRuleBasedPlan(profile: any, waterTarget: number): any {
  const weight = profile.weightKgCurrent || 70;
  const targetWeight = profile.weightKgTarget || weight;
  const height = profile.heightCm || 170;
  const age = profile.age || 25;
  const gender = profile.gender || "Male";
  const activity = profile.activityLevel || "moderate";
  const goal = profile.goalDescription || "maintain fitness";
  const goalLower = goal.toLowerCase();
  const diet = (profile.dietaryPreferences || "non-veg").toLowerCase();
  const isVeg = diet.includes("veg") && !diet.includes("non-veg");
  const cuisines: string[] = profile.cuisines?.length ? profile.cuisines : ["Indian", "Nepali"];
  const timelineDays = profile.goalTimelineDays || 90;

  // TDEE calculation
  const bmr = gender === "Female"
    ? 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
    : 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  const multipliers: Record<string, number> = {
    sedentary: 1.2, lightly_active: 1.375, light: 1.375,
    moderate: 1.55, moderately_active: 1.55,
    very_active: 1.725, "very active": 1.725, active: 1.725,
    athlete: 1.9, extra_active: 1.9,
  };
  const tdee = Math.round(bmr * (multipliers[activity] || 1.55));
  let dailyCal = tdee;
  if (goalLower.includes("lose") || goalLower.includes("cut") || goalLower.includes("fat loss") || goalLower.includes("weight loss") || goalLower.includes("lean")) {
    dailyCal = Math.max(1200, tdee - 500);
  } else if (goalLower.includes("build") || goalLower.includes("gain") || goalLower.includes("bulk") || goalLower.includes("muscle")) {
    dailyCal = tdee + 300;
  }
  const proteinG = Math.round(weight * 1.8);
  const fatG = Math.round((dailyCal * 0.25) / 9);
  const carbsG = Math.round((dailyCal - proteinG * 4 - fatG * 9) / 4);

  // Build meal pools per type (shuffled for variety)
  const breakfastPool = shuffle(filterMeals("breakfast", cuisines, isVeg));
  const lunchPool = shuffle(filterMeals("lunch", cuisines, isVeg));
  const snackPool = shuffle(filterMeals("snack", cuisines, isVeg));
  const dinnerPool = shuffle(filterMeals("dinner", cuisines, isVeg));

  // Workout schedule: strength 3x, cardio 2x, hiit 1x, rest 1x per week
  const workoutOrder = [0, 1, 2, 5, 3, 6, 4]; // indices into WORKOUTS array

  // Build 7-day timeline
  const timeline = Array.from({ length: 7 }, (_, i) => {
    const day = i + 1;
    const workout = WORKOUTS[workoutOrder[i]];

    const meals = [
      { ...pick(breakfastPool, i), type: "breakfast" },
      { ...pick(lunchPool, i), type: "lunch" },
      { ...pick(snackPool, i), type: "snack" },
      { ...pick(dinnerPool, i), type: "dinner" },
    ].map(m => ({
      title: m.title,
      type: m.type,
      calories: m.calories,
      protein_g: m.protein_g,
      carbs_g: m.carbs_g,
      fat_g: m.fat_g,
      ingredients: m.ingredients,
      instructions: m.instructions,
    }));

    // Scale water schedule to hit waterTarget
    const scheduledTotal = WATER_SCHEDULE.reduce((s, w) => s + w.amount_ml, 0);
    const scale = waterTarget / scheduledTotal;
    const water_schedule = WATER_SCHEDULE.map(w => ({
      time: w.time,
      amount_ml: Math.round(w.amount_ml * scale / 50) * 50,
    }));

    return {
      day,
      focus: workout.focus,
      meals,
      workout: {
        title: workout.title,
        duration_min: workout.duration_min,
        calories_burn_est: workout.calories_burn_est,
        steps: workout.steps,
      },
      water_schedule,
    };
  });

  // Grocery list
  const allIngredients: Record<string, string[]> = {
    Proteins: [],
    Grains: [],
    Vegetables: [],
    Fruits: [],
    Dairy: [],
    Spices: [],
    Others: [],
  };
  const proteinKeywords = ["chicken", "egg", "fish", "paneer", "tofu", "dal", "lentil", "prawn", "mutton", "beef", "mince", "chana", "rajma", "bean", "sprout", "edamame"];
  const grainKeywords = ["rice", "roti", "bread", "naan", "paratha", "oat", "poha", "noodle", "chiura", "momo", "flour"];
  const vegKeywords = ["onion", "tomato", "spinach", "broccoli", "carrot", "capsicum", "potato", "cabbage", "bok choy", "mushroom", "corn", "pea", "cucumber", "ginger", "garlic"];
  const fruitKeywords = ["banana", "apple", "pineapple", "lemon"];
  const dairyKeywords = ["curd", "yogurt", "milk", "cream", "ghee", "butter"];
  const spiceKeywords = ["cumin", "turmeric", "masala", "coriander", "pepper", "chili", "mustard", "salt", "soy sauce", "sesame", "cardamom"];

  const added = new Set<string>();
  timeline.forEach(day => {
    day.meals.forEach(meal => {
      meal.ingredients.forEach(ing => {
        const key = ing.toLowerCase().replace(/[\d\s.]+\w*\s/g, "").trim().slice(0, 30);
        if (added.has(key)) return;
        added.add(key);
        const l = ing.toLowerCase();
        if (proteinKeywords.some(k => l.includes(k))) allIngredients.Proteins.push(ing);
        else if (grainKeywords.some(k => l.includes(k))) allIngredients.Grains.push(ing);
        else if (vegKeywords.some(k => l.includes(k))) allIngredients.Vegetables.push(ing);
        else if (fruitKeywords.some(k => l.includes(k))) allIngredients.Fruits.push(ing);
        else if (dairyKeywords.some(k => l.includes(k))) allIngredients.Dairy.push(ing);
        else if (spiceKeywords.some(k => l.includes(k))) allIngredients.Spices.push(ing);
        else allIngredients.Others.push(ing);
      });
    });
  });

  const grocery_list = Object.entries(allIngredients)
    .filter(([, items]) => items.length > 0)
    .map(([category, items]) => ({ category, items: [...new Set(items)].slice(0, 12) }));

  // Milestones
  const weeklyWeightChange = goalLower.includes("lose") || goalLower.includes("cut") ? -0.5 : goalLower.includes("gain") || goalLower.includes("bulk") ? 0.3 : 0;
  const milestones = Array.from({ length: Math.ceil(timelineDays / 7) }, (_, w) => ({
    week: w + 1,
    target_kg: Math.round((weight + weeklyWeightChange * (w + 1)) * 10) / 10,
    focus: w === 0 ? "Build healthy habits" : w === 1 ? "Increase workout intensity" : w === 2 ? "Optimize nutrition timing" : `Continue momentum — week ${w + 1}`,
  })).slice(0, 12);

  const cuisineLabel = cuisines.slice(0, 2).join(" & ");
  const goalLabel = goalLower.includes("lose") ? "Fat Loss" : goalLower.includes("gain") || goalLower.includes("muscle") ? "Muscle Gain" : "Maintenance";

  return {
    meta: {
      plan_name: `${cuisineLabel} ${goalLabel} Plan`,
      duration_days: 7,
      daily_calories_target: dailyCal,
      macros: { protein_g: proteinG, carbs_g: carbsG, fat_g: fatG },
      water_target_ml: waterTarget,
      weight_current_kg: weight,
      weight_target_kg: targetWeight,
      goal,
      timeline_days: timelineDays,
    },
    timeline,
    grocery_list,
    milestones,
  };
}
