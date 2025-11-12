import { Home, Users, FolderKanban, Ruler, UtensilsCrossed, FileText, Activity } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Pacientes",
    url: "/pacientes",
    icon: Users,
  },
  {
    title: "Grupos",
    url: "/grupos",
    icon: FolderKanban,
  },
  {
    title: "Mediciones",
    url: "/mediciones",
    icon: Ruler,
  },
  {
    title: "Biblioteca de Dietas",
    url: "/dietas",
    icon: UtensilsCrossed,
  },
  {
    title: "Informes",
    url: "/informes",
    icon: FileText,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Nutrición</h2>
            <p className="text-xs text-muted-foreground">Carolina Ibáñez</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menú Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              CI
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-sm">
            <p className="font-medium">Carolina Ibáñez</p>
            <p className="text-xs text-muted-foreground">Nutricionista</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
