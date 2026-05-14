import { db } from "./db";
import { fitnessData } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

async function importFitnessData() {
  const existing = await db.select().from(fitnessData).limit(1);
  if (existing.length > 0) {
    console.log("Fitness data already imported, skipping...");
    return;
  }

  const csvPath = path.join(process.cwd(), "data", "fitness_dataset.csv");
  const csv = fs.readFileSync(csvPath, "utf-8");
  const lines = csv.split("\n").filter(l => l.trim().length > 0);
  const rows: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(c => c.trim().replace(/[\n\r\t]/g, ""));
    if (cols.length < 15) continue;
    
    const age = parseFloat(cols[0]);
    const gender = cols[1];
    const weight = parseFloat(cols[2]);
    const height = parseFloat(cols[3]);
    const maxBpm = parseInt(cols[4]);
    const avgBpm = parseInt(cols[5]);
    const restingBpm = parseInt(cols[6]);
    const sessionDuration = parseFloat(cols[7]);
    const caloriesBurned = parseFloat(cols[8]);
    const workoutType = cols[9];
    const fatPercentage = parseFloat(cols[10]);
    const waterIntake = parseFloat(cols[11]);
    const workoutFrequency = parseInt(cols[12]);
    const experienceLevel = parseInt(cols[13]);
    const bmi = parseFloat(cols[14]);

    const allNums = [age, weight, height, maxBpm, avgBpm, restingBpm, sessionDuration, caloriesBurned, fatPercentage, waterIntake, workoutFrequency, experienceLevel, bmi];
    if (allNums.some(n => isNaN(n) || n === null || n === undefined)) continue;
    if (!["Male", "Female"].includes(gender)) continue;
    if (!["Cardio", "Strength", "Yoga", "HIIT"].includes(workoutType)) continue;

    rows.push({
      age, gender, weight, height, maxBpm, avgBpm, restingBpm,
      sessionDuration, caloriesBurned, workoutType, fatPercentage,
      waterIntake, workoutFrequency, experienceLevel, bmi,
    });
  }

  const batchSize = 100;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await db.insert(fitnessData).values(batch);
    console.log(`Imported ${Math.min(i + batchSize, rows.length)}/${rows.length} records`);
  }

  console.log(`✓ Successfully imported ${rows.length} fitness records`);
}

importFitnessData()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
