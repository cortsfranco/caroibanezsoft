import { Home, Users, FolderKanban, Ruler, UtensilsCrossed, FileText, Activity, BookOpen, CookingPot, Calendar, Settings } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logoLight from "@/assets/logo-carolina.svg";
import carolinaAvatar from "@/assets/image_1762966212646.png";

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
    title: "Crear Plan Semanal",
    url: "/crear-plan-semanal",
    icon: Calendar,
  },
  {
    title: "Informes",
    url: "/informes",
    icon: FileText,
  },
  {
    title: "Configuración",
    url: "/configuracion",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 p-1.5 shadow-inner">
            <img src={logoLight} alt="Caro Ibáñez" className="h-full w-full object-contain" />
          </div>
          <div>
            <h2 className="font-heading text-base font-semibold text-white">Caro Ibáñez</h2>
            <p className="text-xs uppercase tracking-[0.28em] text-white/70">Nutrición Deportiva</p>
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
      <SidebarFooter className="p-5 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border border-white/20 bg-white/10">
            <AvatarImage src={logoLight} alt="Carolina Ibáñez" className="object-contain p-1" />
            <AvatarFallback className="bg-white/20 text-white text-sm backdrop-blur-sm">
              CI
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-sm">
            <p className="font-heading font-semibold text-white">Carolina Ibáñez</p>
            <p className="text-xs text-white/70">Consultorio &amp; Alto Rendimiento</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
