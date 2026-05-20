import "@/lib/auth";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isAuthenticated } from "@/lib/auth";

import LandingPage from "@/pages/landing";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import PlayPage from "@/pages/play";
import StoryPage from "@/pages/story";
import LorePage from "@/pages/lore";
import LeaderboardPage from "@/pages/leaderboard";
import ProfilePage from "@/pages/profile";
import AchievementsPage from "@/pages/achievements";
import SettingsPage from "@/pages/settings";
import MultiplayerPage from "@/pages/multiplayer";
import TournamentsPage from "@/pages/tournaments";
import SkillTreePage from "@/pages/skillTree";
import ShopPage from "@/pages/shop";
import WorldEventsPage from "@/pages/worldEvents";
import TeamOpsPage from "@/pages/TeamOpsPage";
import BuzzerPage from "@/pages/BuzzerPage";
import LocalOperationPage from "@/pages/LocalOperationPage";
import StagePage from "@/pages/StagePage";
import StageResults from "@/pages/StageResults";
import HostControl from "@/pages/HostControl";
import AdminLayout from "@/pages/admin/AdminLayout";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  if (!isAuthenticated()) {
    return <Redirect to="/" />;
  }
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/dashboard">
        {() => <ProtectedRoute component={DashboardPage} />}
      </Route>
      <Route path="/play">
        {() => <ProtectedRoute component={PlayPage} />}
      </Route>
      <Route path="/story">
        {() => <ProtectedRoute component={StoryPage} />}
      </Route>
      <Route path="/lore">
        {() => <ProtectedRoute component={LorePage} />}
      </Route>
      <Route path="/leaderboard">
        {() => <ProtectedRoute component={LeaderboardPage} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={ProfilePage} />}
      </Route>
      <Route path="/achievements">
        {() => <ProtectedRoute component={AchievementsPage} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={SettingsPage} />}
      </Route>
      <Route path="/multiplayer">
        {() => <ProtectedRoute component={MultiplayerPage} />}
      </Route>
      <Route path="/tournaments">
        {() => <ProtectedRoute component={TournamentsPage} />}
      </Route>
      <Route path="/skill-tree">
        {() => <ProtectedRoute component={SkillTreePage} />}
      </Route>
      <Route path="/shop">
        {() => <ProtectedRoute component={ShopPage} />}
      </Route>
      <Route path="/world-events">
        {() => <ProtectedRoute component={WorldEventsPage} />}
      </Route>
      <Route path="/team-ops">
        {() => <ProtectedRoute component={TeamOpsPage} />}
      </Route>
      <Route path="/buzzer" component={BuzzerPage} />
      <Route path="/local-operation">
        {() => <ProtectedRoute component={LocalOperationPage} />}
      </Route>
      <Route path="/stage" component={StagePage} />
      <Route path="/stage-results" component={StageResults} />
      <Route path="/host-control">
        {() => <ProtectedRoute component={HostControl} />}
      </Route>
      <Route path="/admin/*?">
        {() => <ProtectedRoute component={AdminLayout} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
