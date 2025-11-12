import { db } from './db';
import { meals, mealTags, mealTagAssignments, weeklyDietPlans, weeklyPlanMeals, patients, patientGroups, groupMemberships } from '../shared/schema';
import { sql } from 'drizzle-orm';

// Helper para convertir números a strings para campos decimal
// Drizzle mapea decimal de PostgreSQL a string en TypeScript para evitar errores de redondeo
function toDecimalString(value: number): string {
  return value.toString();
}

export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  // 1. Crear tags de comidas
  console.log('Creating meal tags...');
  const tagData = [
    { name: 'Proteína', category: 'dietary', color: '#ef4444' },
    { name: 'Carbohidratos', category: 'dietary', color: '#f59e0b' },
    { name: 'Vegetales', category: 'dietary', color: '#10b981' },
    { name: 'Frutas', category: 'dietary', color: '#ec4899' },
    { name: 'Lácteos', category: 'dietary', color: '#3b82f6' },
    { name: 'Grasas Saludables', category: 'dietary', color: '#8b5cf6' },
    { name: 'Snacks', category: 'timing', color: '#06b6d4' },
    { name: 'Bebidas', category: 'dietary', color: '#84cc16' },
    { name: 'Vegano', category: 'dietary', color: '#22c55e' },
    { name: 'Sin Gluten', category: 'dietary', color: '#eab308' },
    { name: 'Bajo en Calorías', category: 'objective', color: '#14b8a6' },
    { name: 'Alto en Fibra', category: 'dietary', color: '#a855f7' }
  ];

  const insertedTags = await db.insert(mealTags).values(tagData).returning();
  console.log(`✓ Created ${insertedTags.length} meal tags`);

  // 2. Crear comidas del catálogo
  console.log('Creating meal catalog...');
  const mealData = [
    // Proteínas
    { name: 'Pechuga de Pollo a la Plancha', category: 'lunch', description: 'Pechuga de pollo sin piel cocida a la plancha', calories: 165, protein: toDecimalString(31), carbs: toDecimalString(0), fats: toDecimalString(3.6), portionSize: '100g' },
    { name: 'Filete de Salmón al Horno', category: 'dinner', description: 'Salmón fresco horneado con limón', calories: 206, protein: toDecimalString(22), carbs: toDecimalString(0), fats: toDecimalString(13), portionSize: '100g' },
    { name: 'Huevos Revueltos', category: 'breakfast', description: 'Dos huevos revueltos sin aceite', calories: 155, protein: toDecimalString(13), carbs: toDecimalString(1.1), fats: toDecimalString(11), portionSize: '2 unidades' },
    { name: 'Atún al Natural', category: 'lunch', description: 'Atún en lata sin aceite', calories: 116, protein: toDecimalString(26), carbs: toDecimalString(0), fats: toDecimalString(0.8), portionSize: '100g' },
    { name: 'Pavo en Lonchas', category: 'snack', description: 'Pechuga de pavo baja en sodio', calories: 89, protein: toDecimalString(18), carbs: toDecimalString(2), fats: toDecimalString(1), portionSize: '100g' },
    
    // Carbohidratos
    { name: 'Arroz Integral Cocido', category: 'lunch', description: 'Arroz integral hervido sin sal', calories: 123, protein: toDecimalString(2.7), carbs: toDecimalString(25.6), fats: toDecimalString(1), portionSize: '100g' },
    { name: 'Avena en Hojuelas', category: 'breakfast', description: 'Avena tradicional sin procesar', calories: 389, protein: toDecimalString(16.9), carbs: toDecimalString(66.3), fats: toDecimalString(6.9), portionSize: '100g' },
    { name: 'Pan Integral', category: 'breakfast', description: 'Pan de trigo integral', calories: 247, protein: toDecimalString(13), carbs: toDecimalString(41), fats: toDecimalString(3.5), portionSize: '2 rebanadas' },
    { name: 'Batata Asada', category: 'lunch', description: 'Camote al horno sin aceite', calories: 90, protein: toDecimalString(2), carbs: toDecimalString(20.7), fats: toDecimalString(0.2), portionSize: '100g' },
    { name: 'Quinoa Cocida', category: 'lunch', description: 'Quinoa hervida', calories: 120, protein: toDecimalString(4.4), carbs: toDecimalString(21.3), fats: toDecimalString(1.9), portionSize: '100g' },
    
    // Vegetales
    { name: 'Brócoli al Vapor', category: 'lunch', description: 'Brócoli cocido al vapor', calories: 35, protein: toDecimalString(2.4), carbs: toDecimalString(7), fats: toDecimalString(0.4), portionSize: '100g' },
    { name: 'Ensalada Mixta', category: 'lunch', description: 'Lechuga, tomate, zanahoria, pepino', calories: 20, protein: toDecimalString(1), carbs: toDecimalString(4), fats: toDecimalString(0.2), portionSize: '100g' },
    { name: 'Espinaca Salteada', category: 'dinner', description: 'Espinaca fresca salteada', calories: 23, protein: toDecimalString(2.9), carbs: toDecimalString(3.6), fats: toDecimalString(0.4), portionSize: '100g' },
    { name: 'Zanahoria Rallada', category: 'snack', description: 'Zanahoria cruda rallada', calories: 41, protein: toDecimalString(0.9), carbs: toDecimalString(9.6), fats: toDecimalString(0.2), portionSize: '100g' },
    
    // Frutas
    { name: 'Manzana Verde', category: 'snack', description: 'Manzana fresca con cáscara', calories: 52, protein: toDecimalString(0.3), carbs: toDecimalString(13.8), fats: toDecimalString(0.2), portionSize: '1 unidad mediana' },
    { name: 'Plátano', category: 'snack', description: 'Plátano maduro', calories: 89, protein: toDecimalString(1.1), carbs: toDecimalString(22.8), fats: toDecimalString(0.3), portionSize: '1 unidad mediana' },
    { name: 'Frutillas', category: 'breakfast', description: 'Frutillas frescas', calories: 32, protein: toDecimalString(0.7), carbs: toDecimalString(7.7), fats: toDecimalString(0.3), portionSize: '100g' },
    { name: 'Arándanos', category: 'snack', description: 'Arándanos frescos', calories: 57, protein: toDecimalString(0.7), carbs: toDecimalString(14.5), fats: toDecimalString(0.3), portionSize: '100g' },
    
    // Lácteos
    { name: 'Yogur Griego Natural', category: 'breakfast', description: 'Yogur griego sin azúcar', calories: 59, protein: toDecimalString(10), carbs: toDecimalString(3.6), fats: toDecimalString(0.4), portionSize: '100g' },
    { name: 'Leche Descremada', category: 'breakfast', description: 'Leche descremada', calories: 34, protein: toDecimalString(3.4), carbs: toDecimalString(5), fats: toDecimalString(0.1), portionSize: '200ml' },
    { name: 'Queso Cottage', category: 'snack', description: 'Queso cottage bajo en grasa', calories: 98, protein: toDecimalString(11), carbs: toDecimalString(3.4), fats: toDecimalString(4.3), portionSize: '100g' },
    
    // Grasas Saludables
    { name: 'Palta', category: 'breakfast', description: 'Aguacate fresco', calories: 160, protein: toDecimalString(2), carbs: toDecimalString(8.5), fats: toDecimalString(14.7), portionSize: '100g' },
    { name: 'Almendras', category: 'snack', description: 'Almendras naturales', calories: 579, protein: toDecimalString(21), carbs: toDecimalString(21.6), fats: toDecimalString(49.9), portionSize: '30g' },
    { name: 'Aceite de Oliva', category: 'lunch', description: 'Aceite de oliva extra virgen', calories: 884, protein: toDecimalString(0), carbs: toDecimalString(0), fats: toDecimalString(100), portionSize: '1 cucharada' },
    
    // Snacks/Bebidas
    { name: 'Té Verde', category: 'snack', description: 'Infusión de té verde sin azúcar', calories: 1, protein: toDecimalString(0), carbs: toDecimalString(0), fats: toDecimalString(0), portionSize: '1 taza' },
    { name: 'Gelatina Light', category: 'snack', description: 'Gelatina sin azúcar', calories: 10, protein: toDecimalString(2), carbs: toDecimalString(0), fats: toDecimalString(0), portionSize: '100g' }
  ];

  const insertedMeals = await db.insert(meals).values(mealData).returning();
  console.log(`✓ Created ${insertedMeals.length} meals`);

  // 3. Asignar tags a comidas
  console.log('Assigning tags to meals...');
  const tagAssignments = [
    // Proteínas
    ...insertedMeals.slice(0, 5).map(meal => ({ mealId: meal.id, tagId: insertedTags[0].id })),
    // Carbohidratos
    ...insertedMeals.slice(5, 10).map(meal => ({ mealId: meal.id, tagId: insertedTags[1].id })),
    // Vegetales
    ...insertedMeals.slice(10, 14).map(meal => ({ mealId: meal.id, tagId: insertedTags[2].id })),
    // Frutas
    ...insertedMeals.slice(14, 18).map(meal => ({ mealId: meal.id, tagId: insertedTags[3].id })),
    // Lácteos
    ...insertedMeals.slice(18, 21).map(meal => ({ mealId: meal.id, tagId: insertedTags[4].id })),
    // Grasas Saludables
    ...insertedMeals.slice(21, 24).map(meal => ({ mealId: meal.id, tagId: insertedTags[5].id })),
    // Bebidas
    { mealId: insertedMeals[24].id, tagId: insertedTags[7].id },
    // Snacks
    { mealId: insertedMeals[25].id, tagId: insertedTags[6].id },
  ];

  await db.insert(mealTagAssignments).values(tagAssignments);
  console.log(`✓ Created ${tagAssignments.length} tag assignments`);

  // 4. Crear grupos de pacientes de ejemplo
  console.log('Creating patient groups...');
  const groupData = [
    { name: 'Gimnasia Artística', description: 'Atletas de gimnasia artística', color: '#3b82f6' },
    { name: 'Consultorio General', description: 'Pacientes de consultorio', color: '#10b981' },
    { name: 'Pérdida de Peso', description: 'Programa de pérdida de peso', color: '#f59e0b' }
  ];

  const insertedGroups = await db.insert(patientGroups).values(groupData).returning();
  console.log(`✓ Created ${insertedGroups.length} patient groups`);

  // 5. Crear pacientes de ejemplo
  console.log('Creating sample patients...');
  const patientData = [
    { 
      name: 'María González', 
      birthDate: new Date('1995-03-15'),
      email: 'maria.gonzalez@email.com',
      phone: '+56912345678',
      objective: 'Aumentar masa muscular',
      isVegetarian: false,
      isVegan: false,
      exercisesRegularly: true,
      sportType: 'Gimnasia Artística',
      exerciseDays: 'Lunes a Viernes',
      exerciseSchedule: '18:00-20:00'
    },
    { 
      name: 'Carlos Rodríguez', 
      birthDate: new Date('1988-07-22'),
      email: 'carlos.rodriguez@email.com',
      phone: '+56987654321',
      objective: 'Bajar de peso',
      isVegetarian: false,
      isVegan: false,
      exercisesRegularly: true,
      sportType: 'Running',
      exerciseDays: 'Lunes, Miércoles, Viernes',
      exerciseSchedule: '7:00-8:00'
    },
    { 
      name: 'Ana Martínez', 
      birthDate: new Date('2000-11-05'),
      email: 'ana.martinez@email.com',
      phone: '+56956781234',
      objective: 'Mantener peso saludable',
      isVegetarian: true,
      isVegan: false,
      foodAllergies: 'Frutos secos',
      exercisesRegularly: false
    }
  ];

  const insertedPatients = await db.insert(patients).values(patientData).returning();
  console.log(`✓ Created ${insertedPatients.length} patients`);

  // 6. Asignar pacientes a grupos
  console.log('Assigning patients to groups...');
  const memberships = [
    { patientId: insertedPatients[0].id, groupId: insertedGroups[0].id },
    { patientId: insertedPatients[1].id, groupId: insertedGroups[2].id },
    { patientId: insertedPatients[2].id, groupId: insertedGroups[1].id }
  ];

  await db.insert(groupMemberships).values(memberships);
  console.log(`✓ Created ${memberships.length} group memberships`);

  // 7. Crear planes semanales de ejemplo (templates)
  console.log('Creating weekly diet plan templates...');
  const planData = [
    {
      name: 'Plan Deportivo Alta Intensidad',
      description: 'Plan para atletas con entrenamiento intenso - 2500 kcal',
      isTemplate: true,
      goal: 'Aumento masa muscular',
      dailyCalories: 2500,
      proteinGrams: toDecimalString(150),
      carbsGrams: toDecimalString(280),
      fatsGrams: toDecimalString(70)
    },
    {
      name: 'Plan Pérdida de Peso',
      description: 'Plan hipocalórico balanceado - 1600 kcal',
      isTemplate: true,
      goal: 'Pérdida de peso',
      dailyCalories: 1600,
      proteinGrams: toDecimalString(120),
      carbsGrams: toDecimalString(160),
      fatsGrams: toDecimalString(50)
    },
    {
      name: 'Plan Vegetariano Equilibrado',
      description: 'Plan vegetariano completo - 2000 kcal',
      isTemplate: true,
      goal: 'Mantenimiento',
      dailyCalories: 2000,
      proteinGrams: toDecimalString(100),
      carbsGrams: toDecimalString(250),
      fatsGrams: toDecimalString(60)
    }
  ];

  const insertedPlans = await db.insert(weeklyDietPlans).values(planData).returning();
  console.log(`✓ Created ${insertedPlans.length} weekly diet plan templates`);

  // 8. Agregar comidas al plan deportivo (Lunes - Miércoles)
  console.log('Adding meals to weekly plans...');
  const plan1Meals = [
    // Lunes
    { planId: insertedPlans[0].id, dayOfWeek: 1, mealSlot: 'breakfast', mealId: insertedMeals[6].id, suggestedTime: '08:00', notes: '50g avena + 200ml leche' },
    { planId: insertedPlans[0].id, dayOfWeek: 1, mealSlot: 'breakfast', slotOrder: 2, mealId: insertedMeals[15].id, suggestedTime: '08:00', notes: '1 plátano' },
    { planId: insertedPlans[0].id, dayOfWeek: 1, mealSlot: 'snack', mealId: insertedMeals[18].id, suggestedTime: '11:00', notes: '150g yogur griego' },
    { planId: insertedPlans[0].id, dayOfWeek: 1, mealSlot: 'lunch', mealId: insertedMeals[0].id, suggestedTime: '14:00', notes: '150g pechuga' },
    { planId: insertedPlans[0].id, dayOfWeek: 1, mealSlot: 'lunch', slotOrder: 2, mealId: insertedMeals[5].id, suggestedTime: '14:00', notes: '150g arroz integral' },
    { planId: insertedPlans[0].id, dayOfWeek: 1, mealSlot: 'lunch', slotOrder: 3, mealId: insertedMeals[11].id, suggestedTime: '14:00', notes: 'Ensalada abundante' },
    { planId: insertedPlans[0].id, dayOfWeek: 1, mealSlot: 'pre-workout', mealId: insertedMeals[14].id, suggestedTime: '17:00', notes: '1 manzana', linkedToExercise: true },
    { planId: insertedPlans[0].id, dayOfWeek: 1, mealSlot: 'post-workout', mealId: insertedMeals[2].id, suggestedTime: '20:30', notes: '2 huevos + 1 tostada', linkedToExercise: true },
    { planId: insertedPlans[0].id, dayOfWeek: 1, mealSlot: 'dinner', mealId: insertedMeals[1].id, suggestedTime: '21:30', notes: '120g salmón' },
    { planId: insertedPlans[0].id, dayOfWeek: 1, mealSlot: 'dinner', slotOrder: 2, mealId: insertedMeals[10].id, suggestedTime: '21:30', notes: 'Brócoli al vapor' },
    
    // Martes
    { planId: insertedPlans[0].id, dayOfWeek: 2, mealSlot: 'breakfast', mealId: insertedMeals[7].id, suggestedTime: '08:00', notes: '2 tostadas integrales' },
    { planId: insertedPlans[0].id, dayOfWeek: 2, mealSlot: 'breakfast', slotOrder: 2, mealId: insertedMeals[21].id, suggestedTime: '08:00', notes: '50g palta' },
    { planId: insertedPlans[0].id, dayOfWeek: 2, mealSlot: 'snack', mealId: insertedMeals[22].id, suggestedTime: '11:00', notes: '20 almendras' },
    { planId: insertedPlans[0].id, dayOfWeek: 2, mealSlot: 'lunch', mealId: insertedMeals[9].id, suggestedTime: '14:00', notes: '150g quinoa' },
    { planId: insertedPlans[0].id, dayOfWeek: 2, mealSlot: 'lunch', slotOrder: 2, mealId: insertedMeals[3].id, suggestedTime: '14:00', notes: '100g atún' },
    
    // Miércoles
    { planId: insertedPlans[0].id, dayOfWeek: 3, mealSlot: 'breakfast', mealId: insertedMeals[6].id, suggestedTime: '08:00', notes: 'Avena con frutas' },
    { planId: insertedPlans[0].id, dayOfWeek: 3, mealSlot: 'lunch', mealId: insertedMeals[0].id, suggestedTime: '14:00', notes: 'Pollo + arroz + ensalada' }
  ];

  await db.insert(weeklyPlanMeals).values(plan1Meals);
  console.log(`✓ Added ${plan1Meals.length} meals to weekly plans`);

  console.log('\n✅ Database seeding completed successfully!\n');
  console.log('Summary:');
  console.log(`  - ${insertedTags.length} meal tags`);
  console.log(`  - ${insertedMeals.length} meals in catalog`);
  console.log(`  - ${tagAssignments.length} tag assignments`);
  console.log(`  - ${insertedGroups.length} patient groups`);
  console.log(`  - ${insertedPatients.length} sample patients`);
  console.log(`  - ${insertedPlans.length} weekly plan templates`);
  console.log(`  - ${plan1Meals.length} meal entries in plans`);
}

// Auto-ejecutar cuando el archivo se llama directamente
seedDatabase()
  .then(() => {
    console.log('Seeding finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  });
