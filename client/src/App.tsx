import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import Dashboard from "@/pages/dashboard";
import PatientsPage from "@/pages/patients";
import PatientProfile from "@/pages/patient-profile";
import GroupsPage from "@/pages/groups";
import GroupDetailPage from "@/pages/group-detail";
import Measurements from "@/pages/measurements";
import Diets from "@/pages/diets";
import DietLibrary from "@/pages/diet-library";
import MealCatalog from "@/pages/meal-catalog";
import WeeklyDietPlanner from "@/pages/weekly-diet-planner";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";
import SettingsPage from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/pacientes" component={PatientsPage} />
      <Route path="/pacientes/:id" component={PatientProfile} />
      <Route path="/grupos" component={GroupsPage} />
      <Route path="/grupos/:id" component={GroupDetailPage} />
      <Route path="/mediciones" component={Measurements} />
      <Route path="/dietas" component={Diets} />
      <Route path="/biblioteca-dietas" component={DietLibrary} />
      <Route path="/catalogo-comidas" component={MealCatalog} />
      <Route path="/crear-plan-semanal" component={WeeklyDietPlanner} />
      <Route path="/informes" component={Reports} />
      <Route path="/configuracion" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between h-16 px-6 border-b shrink-0">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto p-6">
                  <div className="max-w-7xl mx-auto">
                    <Router />
                  </div>
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
