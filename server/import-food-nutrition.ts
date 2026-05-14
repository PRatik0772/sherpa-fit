import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { db } from "./db";
import { foodNutrition } from "@shared/schema";
import { sql } from "drizzle-orm";

async function importFoodNutrition() {
  console.log("Starting Food Nutrition Dataset import...");

  const existingCount = await db.select({ count: sql<number>`count(*)` }).from(foodNutrition);
  if (Number(existingCount[0].count) > 0) {
    console.log(`Food nutrition data already imported (${existingCount[0].count} records). Skipping.`);
    return;
  }

  const groups = [1, 2, 3, 4, 5];
  let totalImported = 0;

  for (const group of groups) {
    const filePath = path.join(
      process.cwd(),
      "attached_assets",
      "food_nutrition",
      `FOOD-DATA-GROUP${group}.csv`
    );

    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}, skipping group ${group}`);
      continue;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    const batch: any[] = [];

    for (const row of records) {
      const p = (key: string) => parseFloat(row[key]) || 0;
      const foodName = row["food"]?.trim();
      if (!foodName) continue;

      batch.push({
        food: foodName,
        caloricValue: p("Caloric Value"),
        fat: p("Fat"),
        saturatedFats: p("Saturated Fats"),
        monounsaturatedFats: p("Monounsaturated Fats"),
        polyunsaturatedFats: p("Polyunsaturated Fats"),
        carbohydrates: p("Carbohydrates"),
        sugars: p("Sugars"),
        protein: p("Protein"),
        dietaryFiber: p("Dietary Fiber"),
        cholesterol: p("Cholesterol"),
        sodium: p("Sodium"),
        water: p("Water"),
        vitaminA: p("Vitamin A"),
        vitaminB1: p("Vitamin B1"),
        vitaminB11: p("Vitamin B11"),
        vitaminB12: p("Vitamin B12"),
        vitaminB2: p("Vitamin B2"),
        vitaminB3: p("Vitamin B3"),
        vitaminB5: p("Vitamin B5"),
        vitaminB6: p("Vitamin B6"),
        vitaminC: p("Vitamin C"),
        vitaminD: p("Vitamin D"),
        vitaminE: p("Vitamin E"),
        vitaminK: p("Vitamin K"),
        calcium: p("Calcium"),
        copper: p("Copper"),
        iron: p("Iron"),
        magnesium: p("Magnesium"),
        manganese: p("Manganese"),
        phosphorus: p("Phosphorus"),
        potassium: p("Potassium"),
        selenium: p("Selenium"),
        zinc: p("Zinc"),
        nutritionDensity: p("Nutrition Density"),
      });
    }

    if (batch.length > 0) {
      const chunkSize = 100;
      for (let j = 0; j < batch.length; j += chunkSize) {
        const chunk = batch.slice(j, j + chunkSize);
        await db.insert(foodNutrition).values(chunk);
      }
      totalImported += batch.length;
      console.log(`Group ${group}: Imported ${batch.length} food items`);
    }
  }

  console.log(`Food Nutrition import complete: ${totalImported} total items`);
}

importFoodNutrition().catch(console.error);
