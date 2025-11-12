import { DietCard } from '../diet-card';

export default function DietCardExample() {
  return (
    <div className="p-8 max-w-sm">
      <DietCard
        id="1"
        name="Plan Deportivo Alta Intensidad"
        calories={2800}
        protein={175}
        carbs={320}
        fats={85}
        tags={["Deportivo", "Alta Intensidad"]}
        description="Plan nutricional para deportistas de alto rendimiento con entrenamiento intenso"
      />
    </div>
  );
}
