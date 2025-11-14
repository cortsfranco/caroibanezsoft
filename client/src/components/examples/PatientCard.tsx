import { PatientCard } from '../patient-card';

export default function PatientCardExample() {
  return (
    <div className="p-8 max-w-sm">
      <PatientCard
        id="1"
        name="Franco Corts"
        age={31}
        lastMeasurement="15/08/2023"
        nextAppointment="20/12/2024"
        objective="gain"
        group="Gimnasia"
      />
    </div>
  );
}
