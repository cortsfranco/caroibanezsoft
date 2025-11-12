import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Copy, Trash2 } from "lucide-react";

interface DietCardProps {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  tags?: string[] | null;
  description?: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function DietCard({
  id,
  name,
  calories,
  protein,
  carbs,
  fats,
  tags,
  description,
  onEdit,
  onDelete,
  onDuplicate,
}: DietCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`diet-card-${id}`}>
      <CardHeader>
        <h3 className="font-semibold" data-testid={`diet-name-${id}`}>
          {name}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">{calories}</span>
          <span className="text-sm text-muted-foreground">kcal/día</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm font-medium">{protein}g</div>
            <div className="text-xs text-muted-foreground">Proteína</div>
          </div>
          <div>
            <div className="text-sm font-medium">{carbs}g</div>
            <div className="text-xs text-muted-foreground">Carbohidratos</div>
          </div>
          <div>
            <div className="text-sm font-medium">{fats}g</div>
            <div className="text-xs text-muted-foreground">Grasas</div>
          </div>
        </div>
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onEdit}
          data-testid={`button-edit-diet-${id}`}
        >
          <Edit className="h-3 w-3 mr-1" />
          Editar
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onDuplicate}
          data-testid={`button-copy-diet-${id}`}
        >
          <Copy className="h-3 w-3 mr-1" />
          Duplicar
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDelete}
          data-testid={`button-delete-diet-${id}`}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </CardFooter>
    </Card>
  );
}
