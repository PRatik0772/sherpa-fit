import fs from "fs";
import path from "path";
import readline from "readline";
import { db } from "./db";
import { openFoodFacts } from "@shared/schema";
import { sql } from "drizzle-orm";

async function importOpenFoodFacts() {
  console.log("Starting Open Food Facts Dataset import...");

  const existingCount = await db.select({ count: sql<number>`count(*)` }).from(openFoodFacts);
  if (Number(existingCount[0].count) > 0) {
    console.log(`Open Food Facts data already imported (${existingCount[0].count} records). Skipping.`);
    return;
  }

  const filePath = "/tmp/datasets/openfoodfacts/en.openfoodfacts.org.products.tsv";
  if (!fs.existsSync(filePath)) {
    console.log("Open Food Facts TSV file not found at:", filePath);
    return;
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let headers: string[] = [];
  let batch: any[] = [];
  let totalImported = 0;
  let lineNum = 0;
  let skipped = 0;
  const BATCH_SIZE = 500;
  const MAX_RECORDS = 100000;

  const colIdx = (name: string) => headers.indexOf(name);

  for await (const line of rl) {
    if (lineNum === 0) {
      headers = line.split("\t");
      lineNum++;
      continue;
    }

    if (totalImported >= MAX_RECORDS) break;

    const cols = line.split("\t");
    const productName = cols[colIdx("product_name")]?.trim();
    const energy = parseFloat(cols[colIdx("energy_100g")]);

    if (!productName || productName.length < 2 || isNaN(energy) || energy <= 0) {
      skipped++;
      lineNum++;
      continue;
    }

    const p = (name: string) => {
      const val = parseFloat(cols[colIdx(name)]);
      return isNaN(val) ? null : val;
    };

    batch.push({
      code: cols[colIdx("code")]?.trim() || null,
      productName: productName.substring(0, 500),
      genericName: cols[colIdx("generic_name")]?.trim()?.substring(0, 500) || null,
      brands: cols[colIdx("brands")]?.trim()?.substring(0, 300) || null,
      categories: cols[colIdx("categories")]?.trim()?.substring(0, 500) || null,
      categoriesEn: cols[colIdx("categories_en")]?.trim()?.substring(0, 500) || null,
      mainCategory: cols[colIdx("main_category")]?.trim()?.substring(0, 300) || null,
      ingredientsText: cols[colIdx("ingredients_text")]?.trim()?.substring(0, 2000) || null,
      allergens: cols[colIdx("allergens")]?.trim()?.substring(0, 300) || null,
      servingSize: cols[colIdx("serving_size")]?.trim()?.substring(0, 100) || null,
      nutritionGrade: cols[colIdx("nutrition_grade_fr")]?.trim()?.substring(0, 5) || null,
      nutritionScoreFr: p("nutrition-score-fr_100g"),
      energy100g: p("energy_100g"),
      fat100g: p("fat_100g"),
      saturatedFat100g: p("saturated-fat_100g"),
      carbohydrates100g: p("carbohydrates_100g"),
      sugars100g: p("sugars_100g"),
      fiber100g: p("fiber_100g"),
      proteins100g: p("proteins_100g"),
      salt100g: p("salt_100g"),
      sodium100g: p("sodium_100g"),
      vitaminA100g: p("vitamin-a_100g"),
      vitaminC100g: p("vitamin-c_100g"),
      vitaminD100g: p("vitamin-d_100g"),
      calcium100g: p("calcium_100g"),
      iron100g: p("iron_100g"),
      magnesium100g: p("magnesium_100g"),
      potassium100g: p("potassium_100g"),
      zinc100g: p("zinc_100g"),
      carbonFootprint100g: p("carbon-footprint_100g"),
      imageUrl: cols[colIdx("image_small_url")]?.trim()?.substring(0, 500) || null,
    });

    if (batch.length >= BATCH_SIZE) {
      try {
        await db.insert(openFoodFacts).values(batch);
        totalImported += batch.length;
        if (totalImported % 5000 === 0) {
          console.log(`  Imported ${totalImported} products...`);
        }
      } catch (err: any) {
        console.log(`  Batch error at line ${lineNum}, skipping batch: ${err.message?.substring(0, 100)}`);
      }
      batch = [];
    }

    lineNum++;
  }

  if (batch.length > 0) {
    try {
      await db.insert(openFoodFacts).values(batch);
      totalImported += batch.length;
    } catch (err: any) {
      console.log(`  Final batch error: ${err.message?.substring(0, 100)}`);
    }
  }

  console.log(`Open Food Facts import complete: ${totalImported} products imported (${skipped} skipped)`);
}

importOpenFoodFacts().catch(console.error);
