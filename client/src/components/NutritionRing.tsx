import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

interface NutritionRingProps {
  calories: number;
  target: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function NutritionRing({ calories, target, protein, carbs, fat }: NutritionRingProps) {
  const remaining = Math.max(0, target - calories);
  const percentage = Math.min(100, (calories / target) * 100);
  
  const data = [
    { name: 'Consumed', value: calories },
    { name: 'Remaining', value: remaining }
  ];

  const macroData = [
    { name: 'Protein', value: protein, color: '#A855F7' }, // Purple
    { name: 'Carbs', value: carbs, color: '#F97316' },    // Orange
    { name: 'Fat', value: fat, color: '#EAB308' },        // Yellow
  ];

  return (
    <div className="relative h-64 w-full flex items-center justify-center">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full transform scale-75" />

      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* Main Calorie Ring */}
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={85}
            outerRadius={100}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
            cornerRadius={10}
          >
            <Cell key="consumed" fill="hsl(var(--primary))" />
            <Cell key="remaining" fill="hsl(var(--secondary))" />
          </Pie>
          
          {/* Inner Macro Ring (Decorative mostly, showing ratios) */}
          <Pie
            data={macroData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={75}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
            cornerRadius={4}
            paddingAngle={5}
          >
            {macroData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} opacity={0.8} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Center Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Remaining</span>
          <div className="text-4xl font-bold font-heading text-white tracking-tighter">
            {remaining}
          </div>
          <span className="text-zinc-500 text-sm font-medium">kcal</span>
        </motion.div>
      </div>
    </div>
  );
}