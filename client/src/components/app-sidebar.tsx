import { Home, Users, FolderKanban, Ruler, UtensilsCrossed, FileText, Activity, BookOpen, CookingPot } from "lucide-react";
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
    title: "Dietas Asignadas",
    url: "/dietas",
    icon: UtensilsCrossed,
  },
  {
    title: "Biblioteca de Dietas",
    url: "/biblioteca-dietas",
    icon: BookOpen,
  },
  {
    title: "Catálogo de Comidas",
    url: "/catalogo-comidas",
    icon: CookingPot,
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
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/20 text-white backdrop-blur-sm">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Nutrición</h2>
            <p className="text-xs text-white/70">Carolina Ibáñez</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/90 font-semibold">Menú Principal</SidebarGroupLabel>
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
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-white/20 text-white text-xs backdrop-blur-sm">
              CI
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-sm">
            <p className="font-medium text-white">Carolina Ibáñez</p>
            <p className="text-xs text-white/70">Nutricionista</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
