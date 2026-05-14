import { db } from "./db";
import { stepsData } from "@shared/schema";
import fs from "fs";
import path from "path";

async function importStepsData() {
  const existing = await db.select().from(stepsData).limit(1);
  if (existing.length > 0) {
    console.log("Steps data already imported, skipping...");
    return;
  }

  const csvPath = path.join(process.cwd(), "attached_assets/steps_data/Steps Export_ 3-17-21to9-23-22.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.trim().split("\n");
  const headers = lines[0].split(",");

  const records: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    if (values.length < 8) continue;

    const date = values[0].trim();
    const stepCount = parseInt(values[1].trim()) || 0;

    const distStr = values[2].trim();
    const distanceKm = parseFloat(distStr.replace(" km", "")) || 0;

    const timeStr = values[3].trim();
    let activeMinutes = 0;
    if (timeStr.includes("hr")) {
      const hrMatch = timeStr.match(/(\d+):(\d+)/);
      if (hrMatch) {
        activeMinutes = parseInt(hrMatch[1]) * 60 + parseInt(hrMatch[2]);
      }
    } else {
      const minMatch = timeStr.match(/(\d+):(\d+)/);
      if (minMatch) {
        activeMinutes = parseInt(minMatch[1]);
      }
    }

    const flightsClimbed = parseInt(values[4].trim()) || 0;
    const goal = parseInt(values[5].trim()) || 10000;
    const goalPercentage = parseInt(values[6].trim().replace("%", "")) || 0;
    const calories = parseInt(values[7].trim()) || 0;

    records.push({
      date,
      stepCount,
      distanceKm,
      activeMinutes,
      flightsClimbed,
      goal,
      goalPercentage,
      calories,
    });
  }

  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await db.insert(stepsData).values(batch);
    console.log(`Imported ${Math.min(i + batchSize, records.length)}/${records.length} step records`);
  }

  console.log(`Successfully imported ${records.length} step tracking records!`);
}

importStepsData().catch(console.error);
