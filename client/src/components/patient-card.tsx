import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, Ruler, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { getObjectiveBadgeClasses, getObjectiveLabel, type NormalizedObjective } from "@/lib/objectives";

interface PatientCardProps {
  id: string;
  name: string;
  age: number;
  lastMeasurement?: string;
  nextAppointment?: string;
  objective?: NormalizedObjective | null;
  group?: string;
}

export function PatientCard({
  id,
  name,
  age,
  lastMeasurement,
  nextAppointment,
  objective,
  group,
}: PatientCardProps) {
  const [, setLocation] = useLocation();
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <Card className="hover-elevate" data-testid={`patient-card-${id}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold" data-testid={`patient-name-${id}`}>
                {name}
              </h3>
              <p className="text-sm text-muted-foreground">{age} años</p>
            </div>
          </div>
          {objective && (
            <Badge variant="secondary" className={getObjectiveBadgeClasses(objective)}>
              {getObjectiveLabel(objective)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {group && (
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{group}</Badge>
          </div>
        )}
        {lastMeasurement && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Ruler className="h-4 w-4" />
            <span>Última medición: {lastMeasurement}</span>
          </div>
        )}
        {nextAppointment && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Próxima cita: {nextAppointment}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1" 
          onClick={() => setLocation(`/pacientes/${id}`)}
          data-testid={`button-view-patient-${id}`}
        >
          <FileText className="h-4 w-4 mr-1" />
          Ver Detalles
        </Button>
        <Button 
          size="sm" 
          className="flex-1" 
          onClick={() => setLocation(`/mediciones?patientId=${id}`)}
          data-testid={`button-measure-patient-${id}`}
        >
          <Ruler className="h-4 w-4 mr-1" />
          Nueva Medición
        </Button>
      </CardFooter>
    </Card>
  );
}
